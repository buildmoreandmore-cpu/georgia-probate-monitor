import { chromium, Browser, Page } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface ScrapedCase {
  caseId: string
  county: string
  filingDate: Date
  decedentName: string
  petitioner?: string
  executor?: string
  administrator?: string
  caseNumber: string
  courtUrl?: string
  rawHtmlPath?: string
  rawPdfPath?: string
  properties: ScrapedProperty[]
}

export interface ScrapedProperty {
  parcelId: string
  situsAddress?: string
  taxMailingAddress?: string
  currentOwner?: string
  qpublicUrl?: string
}

export class PlaywrightScraper {
  private browser: Browser | null = null
  private storageDir = './storage/scraped-data'

  constructor() {
    // Skip filesystem operations during build time or when database isn't available
    if ((process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) || 
        (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.VERCEL_ENV)) {
      console.log('Skipping storage directory creation - build time or no database')
      return
    }
    
    // Ensure storage directory exists
    try {
      mkdirSync(this.storageDir, { recursive: true })
      console.log(`Storage directory created: ${this.storageDir}`)
    } catch (error) {
      console.warn('Failed to create storage directory:', error)
    }
  }

  async initialize(): Promise<void> {
    console.log('Initializing Playwright browser...')
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  }

  async scrapeGeorgiaProbateRecords(dateFrom?: Date): Promise<ScrapedCase[]> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    const cases: ScrapedCase[] = []
    
    try {
      console.log('Navigating to Georgia Probate Records...')
      await page.goto('https://georgiaprobaterecords.com/Estates/SearchEstates.aspx', {
        waitUntil: 'networkidle'
      })

      // Check for terms/conditions modal
      const termsModal = await page.locator('.modal, [class*="terms"], [class*="agreement"]').first()
      if (await termsModal.isVisible()) {
        console.log('Accepting terms and conditions...')
        await page.click('button:has-text("Accept"), button:has-text("I Agree"), .btn-primary')
        await page.waitForTimeout(2000)
      }

      // Fill date range - search for today's filings
      const today = dateFrom || new Date()
      const todayStr = today.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      })

      console.log(`Searching for filings on ${todayStr}...`)
      
      // Fill date fields
      await page.fill('input[id*="FiledStartDate"], input[name*="FiledStartDate"]', todayStr)
      await page.fill('input[id*="FiledEndDate"], input[name*="FiledEndDate"]', todayStr)

      // Submit search
      await page.click('input[type="submit"], button:has-text("Search")')
      await page.waitForTimeout(5000)

      // Check for CAPTCHA or access denied
      const captcha = await page.locator('img[src*="captcha"], [class*="captcha"], [class*="recaptcha"]').first()
      if (await captcha.isVisible()) {
        console.log('CAPTCHA detected - stopping scrape')
        return cases
      }

      const accessDenied = page.locator(':has-text("Access Denied"), :has-text("Blocked"), :has-text("Rate Limited")')
      if (await accessDenied.isVisible()) {
        console.log('Access denied detected - stopping scrape')
        return cases
      }

      // Save raw HTML
      const htmlPath = join(this.storageDir, `georgia-search-${Date.now()}.html`)
      const html = await page.content()
      writeFileSync(htmlPath, html)
      console.log(`Saved raw HTML to ${htmlPath}`)

      // Find result rows
      const resultRows = await page.locator('table tr:has(td), .result-row, [class*="result"]').all()
      console.log(`Found ${resultRows.length} potential result rows`)

      for (let i = 0; i < Math.min(resultRows.length, 10); i++) { // Limit to 10 results
        try {
          const row = resultRows[i]
          const cells = await row.locator('td, .cell').all()
          
          if (cells.length < 3) continue

          // Extract basic info from row
          const caseNumber = await cells[0].textContent() || ''
          const decedentName = await cells[1].textContent() || ''
          const _filingDateStr = await cells[2].textContent() || ''

          if (!caseNumber.trim() || !decedentName.trim()) continue

          // Try to click on case link for details
          const caseLink = await row.locator('a').first()
          if (await caseLink.isVisible()) {
            console.log(`Opening case details for ${caseNumber}...`)
            
            // Open in new tab
            const [detailPage] = await Promise.all([
              page.context().waitForEvent('page'),
              caseLink.click()
            ])

            await detailPage.waitForLoadState('networkidle')
            await this.sleep(2000) // Brief pause

            // Extract detailed case information
            const caseDetails = await this.extractCaseDetails(detailPage, caseNumber)
            
            // Save detail page HTML
            const detailHtmlPath = join(this.storageDir, `case-${caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.html`)
            const detailHtml = await detailPage.content()
            writeFileSync(detailHtmlPath, detailHtml)

            // Try to save as PDF too
            try {
              const pdfPath = join(this.storageDir, `case-${caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.pdf`)
              await detailPage.pdf({ path: pdfPath, format: 'A4' })
              caseDetails.rawPdfPath = pdfPath
            } catch (pdfError) {
              console.warn('Failed to save PDF:', pdfError)
            }

            caseDetails.rawHtmlPath = detailHtmlPath
            cases.push(caseDetails)

            await detailPage.close()
            
            // Sleep between requests
            await this.sleep(15000 + Math.random() * 15000) // 15-30 seconds
          }

        } catch (rowError) {
          console.error(`Error processing row ${i}:`, rowError)
          continue
        }
      }

    } catch (error) {
      console.error('Error scraping Georgia Probate Records:', error)
      throw error
    } finally {
      await page.close()
    }

    return cases
  }

  private async extractCaseDetails(page: Page, caseNumber: string): Promise<ScrapedCase> {
    // Extract case details from the detail page
    const decedentName = await this.extractText(page, [
      ':has-text("Decedent")', 
      ':has-text("Estate of")',
      '.decedent-name',
      '[class*="decedent"]'
    ])

    const petitioner = await this.extractText(page, [
      ':has-text("Petitioner")',
      '.petitioner-name',
      '[class*="petitioner"]'
    ])

    const executor = await this.extractText(page, [
      ':has-text("Executor")',
      ':has-text("Personal Representative")',
      '.executor-name',
      '[class*="executor"]'
    ])

    const administrator = await this.extractText(page, [
      ':has-text("Administrator")',
      '.administrator-name', 
      '[class*="administrator"]'
    ])

    const filingDateText = await this.extractText(page, [
      ':has-text("Filing Date")',
      ':has-text("Filed")',
      '.filing-date',
      '[class*="filing"]'
    ])

    const filingDate = this.parseDate(filingDateText || '') || new Date()

    // Look for property/parcel information
    const properties = await this.extractProperties(page)

    return {
      caseId: `GPR-${Date.now()}-${caseNumber}`,
      county: 'georgia',
      filingDate,
      decedentName: decedentName || 'Unknown Decedent',
      petitioner,
      executor, 
      administrator,
      caseNumber,
      courtUrl: page.url(),
      properties
    }
  }

  private async extractProperties(page: Page): Promise<ScrapedProperty[]> {
    const properties: ScrapedProperty[] = []
    
    try {
      // Look for property/parcel links or information
      const propertyLinks = await page.locator('a[href*="qpublic"], a[href*="parcel"], a:has-text("Property")').all()
      
      for (const link of propertyLinks) {
        const href = await link.getAttribute('href')
        if (!href) continue

        const property: ScrapedProperty = {
          parcelId: await link.textContent() || '',
          qpublicUrl: href
        }

        // If it's a QPublic link, try to extract more details
        if (href.includes('qpublic')) {
          await this.extractQPublicDetails(property, href, page)
        }

        if (property.parcelId) {
          properties.push(property)
        }
      }
    } catch (error) {
      console.warn('Error extracting properties:', error)
    }

    return properties
  }

  private async extractQPublicDetails(property: ScrapedProperty, qpublicUrl: string, currentPage: Page): Promise<void> {
    try {
      console.log(`Extracting QPublic details from ${qpublicUrl}...`)
      
      const [qpublicPage] = await Promise.all([
        currentPage.context().waitForEvent('page'),
        currentPage.evaluate((url) => window.open(url), qpublicUrl)
      ])

      await qpublicPage.waitForLoadState('networkidle')
      await this.sleep(2000)

      // Extract property details
      property.situsAddress = await this.extractText(qpublicPage, [
        ':has-text("Situs Address")',
        ':has-text("Property Address")',
        '.situs-address',
        '[class*="situs"]'
      ])

      property.taxMailingAddress = await this.extractText(qpublicPage, [
        ':has-text("Tax Mailing")',
        ':has-text("Mailing Address")',
        '.tax-mailing',
        '[class*="mailing"]'
      ])

      property.currentOwner = await this.extractText(qpublicPage, [
        ':has-text("Owner")',
        ':has-text("Current Owner")',
        '.owner-name',
        '[class*="owner"]'
      ])

      await qpublicPage.close()
      await this.sleep(5000) // Extra delay after QPublic

    } catch (error) {
      console.warn('Error extracting QPublic details:', error)
    }
  }

  private async extractText(page: Page, selectors: string[]): Promise<string | undefined> {
    for (const selector of selectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible()) {
          const text = await element.textContent()
          if (text?.trim()) {
            return text.trim()
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return undefined
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null
    
    try {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
      
      // Try MM/DD/YYYY format
      const mmddyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (mmddyyyy) {
        return new Date(parseInt(mmddyyyy[3]), parseInt(mmddyyyy[1]) - 1, parseInt(mmddyyyy[2]))
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async scrapeCobb(): Promise<ScrapedCase[]> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    const cases: ScrapedCase[] = []
    
    try {
      console.log('Navigating to Cobb County Probate...')
      await page.goto('https://probateonline.cobbcounty.gov/BenchmarkWeb/Home.aspx/Search', {
        waitUntil: 'networkidle'
      })

      // Similar implementation for Cobb County...
      // For now, return empty array as this would require site-specific implementation

    } catch (error) {
      console.error('Error scraping Cobb County:', error)
    } finally {
      await page.close()
    }

    return cases
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}