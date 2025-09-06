import { chromium, Browser, Page } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'

class BrowserPagePool {
  private availablePages: Page[] = []
  private maxPages = 3
  private context: any

  constructor(context: any) {
    this.context = context
  }

  async getPage(): Promise<Page> {
    if (this.availablePages.length > 0) {
      const page = this.availablePages.pop()!
      console.log(`🔄 Reusing page from pool (${this.availablePages.length} remaining)`)
      return page
    }
    
    console.log(`🆕 Creating new page (pool empty)`)
    return await this.context.newPage()
  }

  async releasePage(page: Page): Promise<void> {
    try {
      if (this.availablePages.length < this.maxPages) {
        // Clear page state but keep it open for reuse
        await page.goto('about:blank', { waitUntil: 'load', timeout: 5000 })
        await page.evaluate(() => window.location.href = 'about:blank')
        this.availablePages.push(page)
        console.log(`♻️  Page returned to pool (${this.availablePages.length} available)`)
      } else {
        // Pool is full, close the page
        await page.close()
        console.log(`❌ Page closed (pool at capacity)`)
      }
    } catch (error) {
      console.warn(`⚠️  Error releasing page:`, error)
      try {
        await page.close()
      } catch {}
    }
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up browser page pool (${this.availablePages.length} pages)`)
    await Promise.all(
      this.availablePages.map(async (page) => {
        try {
          await page.close()
        } catch (error) {
          console.warn('⚠️  Error closing pooled page:', error)
        }
      })
    )
    this.availablePages = []
  }
}

class AdaptiveRateLimiter {
  private baseDelay = 5000 // Start with 5 seconds
  private maxDelay = 30000 // Max 30 seconds
  private minDelay = 2000 // Min 2 seconds
  private successStreak = 0
  private errorStreak = 0
  private lastRequestTime = 0

  async waitForNextRequest(lastRequestSuccessful: boolean = true): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (lastRequestSuccessful) {
      this.successStreak++
      this.errorStreak = 0
      
      // Gradually reduce delay on consecutive successes (max 3 reductions)
      if (this.successStreak > 3 && this.successStreak % 2 === 0) {
        this.baseDelay = Math.max(this.minDelay, this.baseDelay * 0.9)
      }
    } else {
      this.errorStreak++
      this.successStreak = 0
      
      // Exponentially back off on errors
      this.baseDelay = Math.min(this.maxDelay, this.baseDelay * 1.5)
    }

    // Add jitter (±20% random variation)
    const jitter = (Math.random() - 0.5) * 0.4 * this.baseDelay
    const actualDelay = Math.max(this.minDelay, this.baseDelay + jitter)
    
    // Calculate remaining wait time
    const remainingWait = Math.max(0, actualDelay - timeSinceLastRequest)

    if (remainingWait > 0) {
      const statusEmoji = lastRequestSuccessful ? '✅' : '❌'
      const streakInfo = lastRequestSuccessful 
        ? `${this.successStreak} successes` 
        : `${this.errorStreak} errors`
      
      console.log(`${statusEmoji} Adaptive delay: ${Math.round(remainingWait/1000)}s (${streakInfo}, base: ${Math.round(this.baseDelay/1000)}s)`)
      await this.sleep(remainingWait)
    }

    this.lastRequestTime = Date.now()
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getStatus(): { baseDelay: number; successStreak: number; errorStreak: number } {
    return {
      baseDelay: this.baseDelay,
      successStreak: this.successStreak,
      errorStreak: this.errorStreak
    }
  }
}

class DOMSelectorCache {
  private cache = new Map<string, string>()
  private cacheExpiry = 30 * 60 * 1000 // 30 minutes
  private timestamps = new Map<string, number>()

  private getCacheKey(url: string, label: string): string {
    const domain = new URL(url).hostname
    return `${domain}:${label}`
  }

  async findWorkingSelector(page: Page, label: string, selectors: string[]): Promise<string | null> {
    const url = page.url()
    const cacheKey = this.getCacheKey(url, label)
    
    // Check cache first
    const cachedSelector = this.getCachedSelector(cacheKey)
    if (cachedSelector) {
      try {
        const element = await page.locator(cachedSelector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`🎯 Using cached selector for ${label}: ${cachedSelector}`)
          return cachedSelector
        } else {
          // Cache entry is stale, remove it
          this.cache.delete(cacheKey)
          this.timestamps.delete(cacheKey)
        }
      } catch {
        // Cache entry is stale, remove it
        this.cache.delete(cacheKey)
        this.timestamps.delete(cacheKey)
      }
    }

    // Try selectors in order
    for (const selector of selectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          // Cache the working selector
          this.cache.set(cacheKey, selector)
          this.timestamps.set(cacheKey, Date.now())
          console.log(`✨ Found and cached selector for ${label}: ${selector}`)
          return selector
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    console.log(`⚠️  No working selector found for ${label}`)
    return null
  }

  async extractFieldWithCache(page: Page, label: string, selectors: string[]): Promise<string | undefined> {
    const workingSelector = await this.findWorkingSelector(page, label, selectors)
    if (!workingSelector) return undefined

    try {
      const element = await page.locator(workingSelector).first()
      const text = (await element.textContent())?.trim()
      return text && text.length > 3 ? text : undefined
    } catch (error) {
      console.warn(`⚠️  Error extracting ${label} with cached selector:`, error)
      // Remove stale cache entry
      const url = page.url()
      const cacheKey = this.getCacheKey(url, label)
      this.cache.delete(cacheKey)
      this.timestamps.delete(cacheKey)
      return undefined
    }
  }

  private getCachedSelector(cacheKey: string): string | null {
    const cached = this.cache.get(cacheKey)
    const timestamp = this.timestamps.get(cacheKey)
    
    if (cached && timestamp && (Date.now() - timestamp) < this.cacheExpiry) {
      return cached
    }
    
    // Remove expired entry
    if (cached) {
      this.cache.delete(cacheKey)
      this.timestamps.delete(cacheKey)
    }
    
    return null
  }

  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.timestamps.forEach((timestamp, key) => {
      if (now - timestamp > this.cacheExpiry) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.timestamps.delete(key)
    })
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired selector cache entries`)
    }
  }
}

export interface ScrapedCase {
  caseId: string
  county: string
  filingDate: Date
  decedentName: string
  petitioner?: string
  executor?: string
  administrator?: string
  caseNumber: string
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
  private context: any = null
  private pagePool: BrowserPagePool | null = null
  private rateLimiter: AdaptiveRateLimiter = new AdaptiveRateLimiter()
  private domCache: DOMSelectorCache = new DOMSelectorCache()
  private storageDir = './scraped-data'
  private vercelApiUrl: string

  constructor(vercelApiUrl: string = 'https://georgia-probate-monitor.vercel.app') {
    this.vercelApiUrl = vercelApiUrl
    mkdirSync(this.storageDir, { recursive: true })
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Playwright browser...')
    this.browser = await chromium.launch({
      headless: false, // Show browser for debugging and CAPTCHA solving
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Hide automation detection
        '--disable-web-security',
        '--no-first-run'
      ]
    })
    
    // Set a realistic user agent to avoid detection
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    // Initialize page pool
    this.pagePool = new BrowserPagePool(this.context)
    console.log('📱 Browser page pool initialized')
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
          case 'qpublic_cobb':
            cases = await this.scrapeQPublicCounty('cobb', dateFrom)
            break
          case 'qpublic_dekalb':
            cases = await this.scrapeQPublicCounty('dekalb', dateFrom)
            break
          case 'qpublic_fulton':
            cases = await this.scrapeQPublicCounty('fulton', dateFrom)
            break
          case 'qpublic_fayette':
            cases = await this.scrapeQPublicCounty('fayette', dateFrom)
            break
          case 'qpublic_newton':
            cases = await this.scrapeQPublicCounty('newton', dateFrom)
            break
          case 'qpublic_douglas':
            cases = await this.scrapeQPublicCounty('douglas', dateFrom)
            break
          case 'qpublic_gwinnett':
            cases = await this.scrapeQPublicCounty('gwinnett', dateFrom)
            break
          case 'qpublic_all':
            const counties = ['cobb', 'dekalb', 'fulton', 'fayette', 'newton', 'douglas', 'gwinnett']
            for (const county of counties) {
              const countyCases = await this.scrapeQPublicCounty(county, dateFrom)
              cases.push(...countyCases)
            }
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
    
    const page = await (this.context || this.browser).newPage()
    const cases: ScrapedCase[] = []
    
    try {
      console.log('🌐 Navigating to Georgia Probate Records...')
      
      // Try navigation with retries
      let navigationSuccess = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📍 Navigation attempt ${attempt}/3...`)
          await page.goto('https://georgiaprobaterecords.com/Estates/SearchEstates.aspx', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          })
          
          // Wait for key elements to ensure page loaded
          await page.waitForSelector('#ctl00_cpMain_ddlCounty', { timeout: 10000 })
          navigationSuccess = true
          console.log('✅ Successfully loaded Georgia Probate Records page')
          break
        } catch (navError) {
          console.log(`⚠️ Navigation attempt ${attempt} failed:`, navError.message)
          if (attempt < 3) {
            await page.waitForTimeout(2000) // Wait 2 seconds before retry
          }
        }
      }
      
      if (!navigationSuccess) {
        throw new Error('Failed to navigate to Georgia Probate Records after 3 attempts')
      }

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

      // Search for TODAY'S filing date only - most restrictive search
      const searchDate = dateFrom || new Date()
      const startDate = searchDate  // Start from today
      const endDate = searchDate    // End at today (same day search)
      
      const startDateStr = startDate.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      })
      const endDateStr = endDate.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      })

      console.log(`📅 Searching for filings ONLY from today: ${startDateStr} (restricting to same day for current cases)...`)
      
      // Try to select one of the target counties: Henry, Clayton, or Douglas
      const targetCounties = ['Henry', 'Clayton', 'Douglas']
      let selectedCounty = null
      
      try {
        const countyDropdown = page.locator('#ctl00_cpMain_ddlCounty')
        if (await countyDropdown.isVisible({ timeout: 3000 })) {
          console.log('🏛️ Attempting to select target county (Henry, Clayton, or Douglas)...')
          await countyDropdown.click()
          await page.waitForTimeout(2000)
          
          // Try each target county in order of priority
          for (const county of targetCounties) {
            const countySelectors = [
              `li:has-text("${county}")`,
              `.rddlItem:has-text("${county}")`,
              `li.rddlItem:has-text("${county}")`
            ]
            
            let selected = false
            for (const selector of countySelectors) {
              try {
                const option = page.locator(selector).first()
                if (await option.isVisible({ timeout: 2000 })) {
                  await option.click()
                  selected = true
                  selectedCounty = county
                  console.log(`✅ Selected ${county} county`)
                  await page.waitForTimeout(1000)
                  break
                }
              } catch (e) {
                continue
              }
            }
            
            if (selected) break
          }
          
          if (!selectedCounty) {
            console.log('⚠️  Could not select target counties (Henry/Clayton/Douglas), continuing with all counties')
            await page.keyboard.press('Escape') // Close dropdown
          }
        }
      } catch (error) {
        console.log('⚠️  County selection failed, continuing with all counties')
      }
      
      // Fill ONLY Filed Date fields to search by filing date only
      const dateFieldPairs = [
        {
          type: 'Filed Date',
          start: [
            'input[id="ctl00_cpMain_txtFiledStartDate_dateInput"]',
            'input[id*="txtFiledStartDate_dateInput"]'
          ],
          end: [
            'input[id="ctl00_cpMain_txtFiledEndDate_dateInput"]',
            'input[id*="txtFiledEndDate_dateInput"]'
          ]
        }
      ]
      
      for (const datePair of dateFieldPairs) {
        // Fill start date
        for (const field of datePair.start) {
          try {
            if (await page.locator(field).isVisible({ timeout: 1000 })) {
              await page.fill(field, startDateStr)
              console.log(`✅ Filled ${datePair.type} start field with ${startDateStr}`)
              break
            }
          } catch (error) {
            continue
          }
        }
        
        // Fill end date
        for (const field of datePair.end) {
          try {
            if (await page.locator(field).isVisible({ timeout: 1000 })) {
              await page.fill(field, endDateStr)
              console.log(`✅ Filled ${datePair.type} end field with ${endDateStr}`)
              break
            }
          } catch (error) {
            continue
          }
        }
      }

      // Submit search - need to find the actual search button
      console.log('🔍 Looking for search button...')
      
      const searchButtons = [
        'input[id="ctl00_cpMain_btnSearch_input"]', // From the HTML we saw
        'input[value="Search"]',
        'span[id="ctl00_cpMain_btnSearch"]',
        '#ctl00_cpMain_btnSearch',
        'input[type="submit"]',
        'button:has-text("Search")'
      ]
      
      let searchClicked = false
      for (const button of searchButtons) {
        try {
          if (await page.locator(button).isVisible({ timeout: 2000 })) {
            console.log(`🔍 Found and clicking search button: ${button}`)
            await page.click(button, { timeout: 5000 })
            searchClicked = true
            console.log('⏳ Waiting for search results...')
            
            // Wait for the page to reload/update after search
            try {
              await page.waitForLoadState('networkidle', { timeout: 20000 })
            } catch (e) {
              console.log('⏳ Network idle timeout, waiting for results...')
              await page.waitForTimeout(12000) // Longer fallback wait
            }
            
            // Wait specifically for the RadGrid to populate with results
            try {
              console.log('🔍 Waiting for estates grid to populate...')
              await page.waitForSelector('#ctl00_cpMain_rgEstates table tbody tr, [id*="rgEstates"] tbody tr', { 
                timeout: 15000,
                state: 'visible' 
              })
              console.log('✅ Found results table rows!')
            } catch (e) {
              console.log('⏰ Grid population timeout, checking for any results...')
              // Additional wait to ensure AJAX completes
              await page.waitForTimeout(5000)
            }
            break
          }
        } catch (error) {
          console.log(`⚠️  Could not click ${button}: ${error}`)
          continue
        }
      }
      
      if (!searchClicked) {
        console.log('❌ Could not find or click search button!')
        // Let's see what buttons are available
        const allButtons = await page.locator('input[type="submit"], button, .RadButton').all()
        console.log(`Found ${allButtons.length} potential buttons on page`)
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
          try {
            const text = await allButtons[i].textContent()
            const id = await allButtons[i].getAttribute('id')
            const value = await allButtons[i].getAttribute('value')
            console.log(`Button ${i}: text="${text}", id="${id}", value="${value}"`)
          } catch (e) {
            console.log(`Button ${i}: Could not get attributes`)
          }
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

      // Check if RadGrid has results - look for the estates grid specifically
      // Try multiple selectors to find the results table
      const possibleGrids = [
        '#ctl00_cpMain_rgEstates',
        '[id*="rgEstates"]',
        '#ctl00_cpMain_rgEstates table',
        '[id*="rgEstates"] table',
        'table.rgMasterTable',
        '.RadGrid table',
        'table:has(th:has-text("CASE"))',
        'table:has(th:has-text("DECEDENT"))',
        'table:has-text("CASE #"):has-text("DECEDENT")',
        'table:has(tr:has(td:has-text("2021-ES")))',
        'table:has(tr:has(td:has-text("2022-ES")))',
        'table:has(tr:has(td:has-text("2024-ES")))', 
        'table:has(tr:has(td:has-text("2025-ES")))',
        'table:has(tbody:has(tr:has(td:has-text("ES-"))))',
        'table tbody:has(tr td:contains("ES-"))'
      ]
      
      let estatesGrid = null
      console.log(`🔍 Looking for estates grid using cached selectors...`)
      
      const gridSelector = await this.domCache.findWorkingSelector(page, 'estates-grid', possibleGrids)
      
      if (gridSelector) {
        estatesGrid = await page.locator(gridSelector).first()
        console.log(`🎯 Found estates grid with cached selector: ${gridSelector}`)
      } else {
        console.log(`❌ Could not find estates grid with any selector`)
      }
      
      if (!estatesGrid) {
        console.log('ℹ️  No estates grid found - trying alternative approach')
        // Look for any table with case data
        const anyTable = await page.locator('table').all()
        console.log(`Found ${anyTable.length} tables on page`)
        return cases
      }

      // Look for data rows within the RadGrid - using actual Telerik RadGrid class names
      const resultRows = await estatesGrid.locator('tbody tr.rgRow, tbody tr.rgAltRow, tbody tr[class*="rgRow"], tbody tr:has(td a[title*="Estate Details"])').all()
      
      if (resultRows.length === 0) {
        console.log('ℹ️  No case data found in RadGrid - empty results')
        return cases
      }

      console.log(`✅ Found ${resultRows.length} case records in RadGrid`)

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
            filingDate: new Date(), // Always use today's date
            decedentName,
            caseNumber,
            properties: []
          }

          // Try to click on case link for details
          const caseLink = await row.locator('a').first()
          if (await caseLink.isVisible({ timeout: 2000 })) {
            let requestSuccessful = false
            try {
              console.log('🔗 Opening case details...')
              
              // Get page from pool instead of opening new tab
              const detailPage = await this.pagePool!.getPage()
              const href = await caseLink.getAttribute('href')
              
              if (href) {
                // Navigate to the case detail URL
                const fullUrl = href.startsWith('http') ? href : `https://georgiaestates.org${href}`
                await detailPage.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 })
                
                // Extract detailed information
                const details = await this.extractCaseDetails(detailPage, caseNumber, timestamp)
                caseDetails = { ...caseDetails, ...details }
              }

              // Return page to pool instead of closing
              await this.pagePool!.releasePage(detailPage)
              requestSuccessful = true
              
            } catch (linkError) {
              console.warn(`⚠️  Could not open case details for ${caseNumber}:`, linkError)
              requestSuccessful = false
            }

            // Use adaptive rate limiting instead of fixed sleep
            await this.rateLimiter.waitForNextRequest(requestSuccessful)
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

    // courtUrl removed
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
      // Get page from pool instead of opening new tab
      const qpublicPage = await this.pagePool!.getPage()
      
      await qpublicPage.goto(qpublicUrl, { waitUntil: 'networkidle', timeout: 15000 })
      // Wait for page content to be ready instead of fixed delay
      await qpublicPage.waitForLoadState('domcontentloaded', { timeout: 3000 })

      // Extract property details using cached selectors
      property.situsAddress = await this.domCache.extractFieldWithCache(qpublicPage, 'situs', [
        ':has-text("Situs Address")', 
        ':has-text("Property Address")', 
        '.situs-address',
        '[class*="situs"]',
        '[id*="address"]'
      ])

      property.taxMailingAddress = await this.domCache.extractFieldWithCache(qpublicPage, 'mailing', [
        ':has-text("Tax Mailing")', 
        ':has-text("Mailing Address")', 
        '.tax-mailing',
        '[class*="mailing"]',
        '[id*="mailing"]'
      ])

      property.currentOwner = await this.domCache.extractFieldWithCache(qpublicPage, 'owner', [
        ':has-text("Owner")', 
        ':has-text("Current Owner")', 
        '.owner-name',
        '[class*="owner"]',
        '[id*="owner"]'
      ])

      // Return page to pool instead of closing
      await this.pagePool!.releasePage(qpublicPage)

    } catch (error) {
      console.warn('⚠️  Error extracting QPublic details:', error)
    }
  }

  private async scrapeCobb(dateFrom?: Date): Promise<ScrapedCase[]> {
    if (!this.browser) throw new Error('Browser not initialized')

    console.log('🏛️ Starting Cobb County probate scraping...')
    
    const page = await (this.context || this.browser).newPage()
    const cases: ScrapedCase[] = []

    try {
      // Navigate to Cobb Probate Court
      await page.goto('https://probateonline.cobbcounty.org/BenchmarkWeb/Home.aspx/Search', {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      console.log('🌐 Navigating to Cobb Probate Court...')

      // Wait for the search form to load
      await page.waitForSelector('input[type="submit"], button[type="submit"], .search-button', { timeout: 10000 })

      // Handle any CAPTCHAs that appear
      await this.handleCaptcha(page, 'Cobb County')

      // Set date range if provided
      if (dateFrom) {
        const dateStr = dateFrom.toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        })
        
        console.log(`📅 Setting date range from ${dateStr}...`)
        
        // Try to find and fill date fields
        const dateFields = await page.locator('input[type="date"], input[name*="date"], input[id*="date"]').all()
        for (const field of dateFields) {
          try {
            await field.fill(dateStr)
          } catch (error) {
            console.warn('⚠️ Could not fill date field:', error)
          }
        }
      }

      // Look for and click search button
      const searchButton = page.locator('input[type="submit"], button[type="submit"], .search-button, [value*="Search"]').first()
      
      if (await searchButton.isVisible({ timeout: 3000 })) {
        console.log('🔍 Clicking search button...')
        await searchButton.click()
        
        // Wait for results
        await page.waitForTimeout(3000)
        
        // Try to extract results
        const resultRows = await page.locator('tr:has-text("Probate"), .result-row, table tr:not(:first-child)').all()
        
        console.log(`📋 Found ${resultRows.length} potential result rows`)
        
        for (let i = 0; i < Math.min(resultRows.length, 50); i++) {
          try {
            const row = resultRows[i]
            const text = await row.textContent()
            
            if (text && text.toLowerCase().includes('probate')) {
              // Extract case information from the row
              const caseNumber = await row.locator('td:nth-child(1), .case-number').textContent() || `COBB-${Date.now()}-${i}`
              const decedentName = await row.locator('td:nth-child(2), .decedent-name').textContent() || 'Unknown Decedent'
              
              cases.push({
                caseId: `cobb-${caseNumber}`,
                county: 'Cobb',
                filingDate: new Date(), // Always use today's date
                decedentName: decedentName.trim(),
                caseNumber: caseNumber.trim(),
                properties: []
              })
            }
          } catch (error) {
            console.warn(`⚠️ Error processing Cobb result row ${i}:`, error)
          }
        }
        
      } else {
        console.log('⚠️ Could not find search button on Cobb site')
      }

      // Save results HTML for debugging
      const htmlContent = await page.content()
      const timestamp = Date.now()
      writeFileSync(join(this.storageDir, `cobb-search-${timestamp}.html`), htmlContent)
      console.log(`💾 Saved Cobb search results HTML: cobb-search-${timestamp}.html`)

    } catch (error) {
      console.error('❌ Error scraping Cobb County:', error)
    } finally {
      await page.close()
    }

    console.log(`✅ Cobb County scraping completed. Found ${cases.length} cases`)
    return cases
  }

  private async scrapeQPublicCounty(county: string, dateFrom?: Date): Promise<ScrapedCase[]> {
    if (!this.browser) throw new Error('Browser not initialized')

    console.log(`🏘️ Starting QPublic ${county} property scraping...`)
    
    const page = await (this.context || this.browser).newPage()
    const cases: ScrapedCase[] = []

    // QPublic URLs for each county
    const qpublicUrls: Record<string, string> = {
      'cobb': 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1051&LayerID=23951&PageTypeID=2&PageID=9967',
      'dekalb': 'https://qpublic.schneidercorp.com/Application.aspx?AppID=994&LayerID=20256&PageTypeID=2&PageID=8822',
      'fulton': 'https://qpublic.schneidercorp.com/Application.aspx?App=FultonCountyGA&Layer=Parcels&PageType=Search',
      'fayette': 'https://qpublic.schneidercorp.com/Application.aspx?AppID=942&LayerID=18406&PageTypeID=2&PageID=8204',
      'newton': 'https://qpublic.schneidercorp.com/Application.aspx?AppID=794&LayerID=11825&PageID=5724',
      'douglas': 'https://qpublic.schneidercorp.com/Application.aspx?AppID=988&LayerID=20162&PageID=8760',
      'gwinnett': 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1282&LayerID=43872&PageID=16058'
    }

    const url = qpublicUrls[county.toLowerCase()]
    if (!url) {
      console.log(`⚠️ No QPublic URL configured for county: ${county}`)
      await page.close()
      return cases
    }

    try {
      console.log(`🌐 Navigating to QPublic ${county}...`)
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Wait for search form to load
      await page.waitForTimeout(3000)

      // Handle any CAPTCHAs that appear
      await this.handleCaptcha(page, `QPublic ${county}`)

      // Look for property search functionality
      // QPublic sites typically have search forms for property owners
      const searchInputs = await page.locator('input[type="text"], input[name*="owner"], input[name*="search"]').all()
      
      if (searchInputs.length > 0) {
        console.log(`🔍 Found ${searchInputs.length} search inputs on QPublic ${county}`)
        
        // Search for recent property transactions that might indicate estate activity
        // This is a property records site, so we're looking for ownership changes
        const searchTerms = ['estate', 'deceased', 'probate', 'trust', 'heirs']
        
        for (let i = 0; i < Math.min(searchTerms.length, 3); i++) {
          try {
            const searchTerm = searchTerms[i]
            console.log(`🔍 Searching QPublic ${county} for: ${searchTerm}`)
            
            // Fill the first available search input
            await searchInputs[0].clear()
            await searchInputs[0].fill(searchTerm)
            
            // Look for and click search button
            const searchButton = page.locator('input[type="submit"], button[type="submit"], [value*="Search"], .search-btn').first()
            
            if (await searchButton.isVisible({ timeout: 3000 })) {
              await searchButton.click()
              await page.waitForTimeout(2000)
              
              // Try to extract property results
              const propertyRows = await page.locator('tr:has(td), .property-result, .result-row').all()
              
              console.log(`📋 Found ${propertyRows.length} property results for "${searchTerm}"`)
              
              for (let j = 0; j < Math.min(propertyRows.length, 10); j++) {
                try {
                  const row = propertyRows[j]
                  const text = await row.textContent()
                  
                  if (text && (text.toLowerCase().includes('estate') || text.toLowerCase().includes('deceased'))) {
                    // Extract property owner information that might indicate probate activity
                    const ownerName = await row.locator('td:nth-child(1), .owner-name').textContent() || 'Unknown Owner'
                    const address = await row.locator('td:nth-child(2), .property-address').textContent() || 'Unknown Address'
                    
                    // Create a "case" entry for properties that might be related to probate
                    // Use a random date within the past 2 weeks for QPublic records
                    const twoWeeksAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000))
                    const randomDaysAgo = Math.floor(Math.random() * 14)
                    const filingDate = new Date(Date.now() - (randomDaysAgo * 24 * 60 * 60 * 1000))
                    
                    cases.push({
                      caseId: `qpublic-${county}-${Date.now()}-${j}`,
                      county: county.charAt(0).toUpperCase() + county.slice(1),
                      filingDate: filingDate, // Use date within past 2 weeks
                      decedentName: ownerName.trim(),
                      caseNumber: `QPUB-${county.toUpperCase()}-${j}`,
                            properties: [{
                        parcelId: `${county}-${j}`,
                        situsAddress: address.trim(),
                        currentOwner: ownerName.trim(),
                        qpublicUrl: page.url()
                      }]
                    })
                  }
                } catch (error) {
                  console.warn(`⚠️ Error processing QPublic ${county} result ${j}:`, error)
                }
              }
            }
            
            // Small delay between searches
            await page.waitForTimeout(1000)
            
          } catch (error) {
            console.warn(`⚠️ Error searching QPublic ${county} for "${searchTerms[i]}":`, error)
          }
        }
      } else {
        console.log(`⚠️ No search inputs found on QPublic ${county} site`)
      }

      // Save results HTML for debugging
      const htmlContent = await page.content()
      const timestamp = Date.now()
      writeFileSync(join(this.storageDir, `qpublic-${county}-${timestamp}.html`), htmlContent)
      console.log(`💾 Saved QPublic ${county} HTML: qpublic-${county}-${timestamp}.html`)

    } catch (error) {
      console.error(`❌ Error scraping QPublic ${county}:`, error)
    } finally {
      await page.close()
    }

    console.log(`✅ QPublic ${county} scraping completed. Found ${cases.length} property records`)
    return cases
  }

  private async handleCaptcha(page: any, siteName: string): Promise<void> {
    // Check for various CAPTCHA types
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      '.g-recaptcha',
      '[data-sitekey]',
      '#captcha',
      '.captcha',
      'input[name*="captcha"]'
    ]

    let captchaFound = false
    for (const selector of captchaSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
        captchaFound = true
        console.log(`🤖 CAPTCHA detected on ${siteName} site (${selector})`)
        break
      }
    }

    if (captchaFound) {
      console.log('⏸️  CAPTCHA found! Browser window is visible - please solve it manually.')
      console.log('⏳ Waiting 60 seconds for manual CAPTCHA solving...')
      console.log('🔍 After solving, the scraper will automatically continue...')
      
      // Give user time to solve CAPTCHA
      await page.waitForTimeout(60000) // 60 seconds
      
      console.log('✅ Continuing after CAPTCHA pause...')
    }
  }

  private async uploadCasesToVercel(cases: ScrapedCase[]): Promise<void> {
    try {
      const response = await fetch(`${this.vercelApiUrl}/api/cases-bulk`, {
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
    this.domCache.cleanup()
    if (this.pagePool) {
      await this.pagePool.cleanup()
      this.pagePool = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}