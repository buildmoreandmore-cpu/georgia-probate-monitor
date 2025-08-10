import { chromium, Browser, Page } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'

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

export class HybridPlaywrightScraper {
  private browser: Browser | null = null
  private storageDir = './scraped-data'
  private vercelApiUrl: string

  constructor(vercelApiUrl: string = 'https://georgia-probate-monitor.vercel.app') {
    this.vercelApiUrl = vercelApiUrl
    mkdirSync(this.storageDir, { recursive: true })
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Playwright browser...')
    this.browser = await chromium.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  }

  async scrapeAndUpload(sites: string[] = ['georgia_probate_records'], dateFrom?: Date): Promise<void> {
    if (!this.browser) throw new Error('Browser not initialized')

    for (const site of sites) {
      console.log(`\n📋 Starting scrape for ${site}...`)
      
      try {
        let cases: ScrapedCase[] = []

        switch (site) {
          case 'georgia_probate_records':
            cases = await this.scrapeGeorgiaProbateRecords(dateFrom)
            break
          case 'cobb_probate':
            cases = await this.scrapeCobb(dateFrom)
            break
          default:
            console.warn(`❓ Unknown site: ${site}`)
            continue
        }

        if (cases.length > 0) {
          console.log(`📤 Uploading ${cases.length} cases to Vercel...`)
          await this.uploadCasesToVercel(cases)
        } else {
          console.log(`ℹ️  No cases found for ${site}`)
        }

      } catch (error) {
        console.error(`❌ Error scraping ${site}:`, error)
      }
    }
  }

  private async scrapeGeorgiaProbateRecords(dateFrom?: Date): Promise<ScrapedCase[]> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    const cases: ScrapedCase[] = []
    
    try {
      console.log('🌐 Navigating to Georgia Probate Records...')
      await page.goto('https://georgiaprobaterecords.com/Estates/SearchEstates.aspx', {
        waitUntil: 'networkidle'
      })

      // Check for terms/conditions modal
      try {
        const termsSelectors = [
          'button:has-text("Accept")', 
          'button:has-text("I Agree")', 
          '.btn-primary:has-text("Accept")',
          '[class*="accept"]',
          '[class*="agree"]'
        ]
        
        for (const selector of termsSelectors) {
          const button = page.locator(selector).first()
          if (await button.isVisible({ timeout: 3000 })) {
            console.log('✅ Accepting terms and conditions...')
            await button.click()
            await page.waitForTimeout(2000)
            break
          }
        }
      } catch (error) {
        console.log('ℹ️  No terms modal found, continuing...')
      }

      // Fill date range - search for today's filings
      const today = dateFrom || new Date()
      const todayStr = today.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      })

      console.log(`📅 Searching for filings on ${todayStr}...`)
      
      // Try multiple date field patterns
      const dateFields = [
        'input[id*="FiledStartDate"]',
        'input[name*="FiledStartDate"]',
        'input[id*="txtFiledStartDate"]',
        'input[name*="txtFiledStartDate"]'
      ]
      
      for (const field of dateFields) {
        try {
          if (await page.locator(field).isVisible({ timeout: 1000 })) {
            await page.fill(field, todayStr)
            console.log(`✅ Filled start date field: ${field}`)
            break
          }
        } catch (error) {
          continue
        }
      }

      // Submit search
      const searchButtons = [
        'input[type="submit"]',
        'button:has-text("Search")',
        'input[value*="Search"]',
        '#btnSearch',
        '.search-button'
      ]
      
      for (const button of searchButtons) {
        try {
          if (await page.locator(button).isVisible({ timeout: 1000 })) {
            console.log('🔍 Clicking search button...')
            await page.click(button)
            await page.waitForTimeout(5000)
            break
          }
        } catch (error) {
          continue
        }
      }

      // Check for CAPTCHA or access denied
      const blockers = await page.locator(`
        img[src*="captcha"], 
        [class*="captcha"], 
        [class*="recaptcha"],
        :has-text("Access Denied"),
        :has-text("Blocked"),
        :has-text("Rate Limited")
      `).first()
      
      if (await blockers.isVisible({ timeout: 3000 })) {
        console.log('🛑 CAPTCHA or access denied detected - stopping scrape')
        return cases
      }

      // Save raw HTML
      const timestamp = Date.now()
      const htmlPath = join(this.storageDir, `georgia-search-${timestamp}.html`)
      const html = await page.content()
      writeFileSync(htmlPath, html)
      console.log(`💾 Saved search results HTML: ${htmlPath}`)

      // Find result rows - try multiple patterns
      const resultSelectors = [
        'table tr:has(td)',
        '.RadGrid tbody tr',
        '[class*="result"] tr',
        '.search-results tr',
        'tr:has(td:nth-child(3))'
      ]
      
      let resultRows: any[] = []
      for (const selector of resultSelectors) {
        resultRows = await page.locator(selector).all()
        if (resultRows.length > 1) { // More than header row
          console.log(`✅ Found ${resultRows.length} result rows using: ${selector}`)
          break
        }
      }

      if (resultRows.length <= 1) {
        console.log('ℹ️  No result rows found')
        return cases
      }

      // Process results (skip header row)
      for (let i = 1; i < Math.min(resultRows.length, 11); i++) {
        try {
          const row = resultRows[i]
          const cells = await row.locator('td').all()
          
          if (cells.length < 3) continue

          // Extract basic info from row
          const caseNumber = (await cells[0].textContent())?.trim() || ''
          const decedentName = (await cells[1].textContent())?.trim() || ''
          const filingDateStr = (await cells[2].textContent())?.trim() || ''

          if (!caseNumber || !decedentName) continue

          console.log(`📄 Processing case: ${caseNumber} - ${decedentName}`)

          // Try to get case details
          let caseDetails: ScrapedCase = {
            caseId: `GPR-${timestamp}-${i}`,
            county: 'georgia',
            filingDate: this.parseDate(filingDateStr) || new Date(),
            decedentName,
            caseNumber,
            properties: []
          }

          // Try to click on case link for details
          const caseLink = await row.locator('a').first()
          if (await caseLink.isVisible({ timeout: 2000 })) {
            try {
              console.log('🔗 Opening case details...')
              
              // Open in new tab
              const [detailPage] = await Promise.all([
                page.context().waitForEvent('page'),
                caseLink.click({ timeout: 5000 })
              ])

              await detailPage.waitForLoadState('networkidle', { timeout: 10000 })
              
              // Extract detailed information
              const details = await this.extractCaseDetails(detailPage, caseNumber, timestamp)
              caseDetails = { ...caseDetails, ...details }

              await detailPage.close()
              
              // Sleep between requests
              const sleepTime = 15000 + Math.random() * 15000 // 15-30 seconds
              console.log(`😴 Sleeping for ${Math.round(sleepTime/1000)}s...`)
              await this.sleep(sleepTime)
              
            } catch (linkError) {
              console.warn(`⚠️  Could not open case details for ${caseNumber}:`, linkError)
            }
          }

          cases.push(caseDetails)

        } catch (rowError) {
          console.error(`❌ Error processing row ${i}:`, rowError)
          continue
        }
      }

    } catch (error) {
      console.error('❌ Error scraping Georgia Probate Records:', error)
      throw error
    } finally {
      await page.close()
    }

    return cases
  }

  private async extractCaseDetails(page: Page, caseNumber: string, timestamp: number): Promise<Partial<ScrapedCase>> {
    const details: Partial<ScrapedCase> = {}

    // Extract various fields using multiple selectors
    const extractors = [
      {
        field: 'petitioner',
        selectors: [':has-text("Petitioner")', '.petitioner-name', '[class*="petitioner"]']
      },
      {
        field: 'executor', 
        selectors: [':has-text("Executor")', ':has-text("Personal Representative")', '.executor-name']
      },
      {
        field: 'administrator',
        selectors: [':has-text("Administrator")', '.administrator-name', '[class*="administrator"]']
      }
    ]

    for (const extractor of extractors) {
      for (const selector of extractor.selectors) {
        try {
          const element = await page.locator(selector).first()
          if (await element.isVisible({ timeout: 2000 })) {
            const text = (await element.textContent())?.trim()
            if (text && text.length > 3) {
              details[extractor.field as keyof ScrapedCase] = text as any
              break
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    }

    // Save detail page HTML and PDF
    const safeNumber = caseNumber.replace(/[^a-zA-Z0-9]/g, '_')
    
    const detailHtmlPath = join(this.storageDir, `case-${safeNumber}-${timestamp}.html`)
    const detailHtml = await page.content()
    writeFileSync(detailHtmlPath, detailHtml)
    details.rawHtmlPath = detailHtmlPath

    try {
      const pdfPath = join(this.storageDir, `case-${safeNumber}-${timestamp}.pdf`)
      await page.pdf({ path: pdfPath, format: 'A4' })
      details.rawPdfPath = pdfPath
      console.log(`💾 Saved case PDF: ${pdfPath}`)
    } catch (pdfError) {
      console.warn('⚠️  Failed to save PDF:', pdfError)
    }

    details.courtUrl = page.url()
    details.properties = await this.extractProperties(page)

    return details
  }

  private async extractProperties(page: Page): Promise<ScrapedProperty[]> {
    const properties: ScrapedProperty[] = []
    
    try {
      // Look for property/parcel links
      const propertyLinks = await page.locator('a[href*="qpublic"], a[href*="parcel"], a:has-text("Property")').all()
      
      for (const link of propertyLinks.slice(0, 3)) { // Limit to 3 properties
        try {
          const href = await link.getAttribute('href')
          const text = await link.textContent()
          
          if (!href) continue

          const property: ScrapedProperty = {
            parcelId: text?.trim() || '',
            qpublicUrl: href.startsWith('http') ? href : `https://qpublic.schneidercorp.com${href}`
          }

          // Try to get QPublic details
          if (href.includes('qpublic')) {
            console.log(`🏠 Extracting property details from QPublic...`)
            await this.extractQPublicDetails(property, property.qpublicUrl!, page)
          }

          if (property.parcelId) {
            properties.push(property)
          }
        } catch (linkError) {
          console.warn('⚠️  Error processing property link:', linkError)
        }
      }
    } catch (error) {
      console.warn('⚠️  Error extracting properties:', error)
    }

    return properties
  }

  private async extractQPublicDetails(property: ScrapedProperty, qpublicUrl: string, currentPage: Page): Promise<void> {
    try {
      const [qpublicPage] = await Promise.all([
        currentPage.context().waitForEvent('page'),
        currentPage.evaluate((url) => window.open(url), qpublicUrl)
      ])

      await qpublicPage.waitForLoadState('networkidle', { timeout: 15000 })
      await this.sleep(3000)

      // Extract property details with multiple selector attempts
      const extractField = async (label: string, selectors: string[]) => {
        for (const selector of selectors) {
          try {
            const element = await qpublicPage.locator(selector).first()
            if (await element.isVisible({ timeout: 2000 })) {
              const text = (await element.textContent())?.trim()
              if (text && text.length > 3) return text
            }
          } catch (error) {
            // Continue
          }
        }
        return undefined
      }

      property.situsAddress = await extractField('situs', [
        ':has-text("Situs Address")', 
        ':has-text("Property Address")', 
        '.situs-address'
      ])

      property.taxMailingAddress = await extractField('mailing', [
        ':has-text("Tax Mailing")', 
        ':has-text("Mailing Address")', 
        '.tax-mailing'
      ])

      property.currentOwner = await extractField('owner', [
        ':has-text("Owner")', 
        ':has-text("Current Owner")', 
        '.owner-name'
      ])

      await qpublicPage.close()
      await this.sleep(5000) // Extra delay after QPublic

    } catch (error) {
      console.warn('⚠️  Error extracting QPublic details:', error)
    }
  }

  private async scrapeCobb(dateFrom?: Date): Promise<ScrapedCase[]> {
    console.log('🏛️  Cobb County scraping not yet implemented')
    return []
  }

  private async uploadCasesToVercel(cases: ScrapedCase[]): Promise<void> {
    try {
      const response = await fetch(`${this.vercelApiUrl}/api/test-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_KEY || 'local-scraper'}`
        },
        body: JSON.stringify({
          cases: cases.map(c => ({
            caseId: c.caseId,
            county: c.county,
            filingDate: c.filingDate.toISOString(),
            decedentName: c.decedentName,
            caseNumber: c.caseNumber,
            attorney: c.executor || c.administrator,
            courtUrl: c.courtUrl,
            contacts: [
              c.petitioner && { type: 'petitioner', name: c.petitioner },
              c.executor && { type: 'executor', name: c.executor },
              c.administrator && { type: 'administrator', name: c.administrator }
            ].filter(Boolean),
            properties: c.properties
          }))
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Successfully uploaded cases to Vercel:`, result)
      } else {
        console.error('❌ Failed to upload to Vercel:', response.status, await response.text())
      }
    } catch (error) {
      console.error('❌ Error uploading to Vercel:', error)
    }
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null
    
    try {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) return parsed
      
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

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}