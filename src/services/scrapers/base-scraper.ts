import { Browser, BrowserContext, Page, chromium } from 'playwright'

export interface ScrapedCase {
  caseId: string
  county: string
  filingDate: Date
  decedentName: string
  decedentAddress?: string
  estateValue?: number
  caseNumber?: string
  attorney?: string
  attorneyPhone?: string
  courtUrl?: string
  contacts: ScrapedContact[]
}

export interface ScrapedContact {
  type: 'executor' | 'administrator' | 'petitioner'
  name: string
  address?: string
  phone?: string
  relationship?: string
}

export abstract class BaseScraper {
  protected browser: Browser | null = null
  protected context: BrowserContext | null = null
  protected userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]

  abstract scrape(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]>

  protected async initBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    })

    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
  }

  protected async createPage(): Promise<Page> {
    if (!this.context) {
      await this.initBrowser()
    }
    return this.context!.newPage()
  }

  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  protected async delay(ms: number = 2000): Promise<void> {
    const delayMs = ms + Math.random() * 1000 // Add some randomness
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 2000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await this.delay(delayMs * (i + 1))
      }
    }
    throw new Error('Max retries exceeded')
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}