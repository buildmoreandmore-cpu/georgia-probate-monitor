import { Page } from 'playwright'
import { BaseScraper, ScrapedCase } from '../scrapers/base-scraper'

export interface PropertyRecord {
  parcelId: string
  county: string
  situsAddress: string
  taxMailingAddress?: string
  currentOwner: string
  lastSaleDate?: Date
  assessedValue?: number
  legalDescription?: string
  qpublicUrl: string
}

export class QPublicScraper extends BaseScraper {
  private readonly countyUrls = {
    cobb: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1051&LayerID=23951&PageTypeID=2&PageID=9967',
    dekalb: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=994&LayerID=20256&PageTypeID=2&PageID=8822',
    fulton: 'https://qpublic.schneidercorp.com/Application.aspx?App=FultonCountyGA&Layer=Parcels&PageType=Search',
    fayette: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=942&LayerID=18406&PageTypeID=2&PageID=8204',
    newton: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=794&LayerID=11825&PageID=5724',
    douglas: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=988&LayerID=20162&PageID=8760',
    gwinnett: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1282&LayerID=43872&PageID=16058'
  }

  async scrape(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]> {
    throw new Error('Use searchByOwner or searchByAddress instead')
  }

  async searchByOwner(ownerName: string, county: string): Promise<PropertyRecord[]> {
    const page = await this.createPage()
    const properties: PropertyRecord[] = []

    try {
      const countyUrl = this.countyUrls[county as keyof typeof this.countyUrls]
      if (!countyUrl) {
        throw new Error(`Unsupported county: ${county}`)
      }

      await this.retryOperation(async () => {
        await page.goto(countyUrl, { waitUntil: 'networkidle' })
      })

      await this.performOwnerSearch(page, ownerName, county, properties)
      
      return properties
    } finally {
      await page.close()
    }
  }

  async searchByAddress(address: string, county: string): Promise<PropertyRecord[]> {
    const page = await this.createPage()
    const properties: PropertyRecord[] = []

    try {
      const countyUrl = this.countyUrls[county as keyof typeof this.countyUrls]
      if (!countyUrl) {
        throw new Error(`Unsupported county: ${county}`)
      }

      await this.retryOperation(async () => {
        await page.goto(countyUrl, { waitUntil: 'networkidle' })
      })

      await this.performAddressSearch(page, address, county, properties)
      
      return properties
    } finally {
      await page.close()
    }
  }

  private async performOwnerSearch(page: Page, ownerName: string, county: string, properties: PropertyRecord[]): Promise<void> {
    try {
      // Wait for search form
      await page.waitForSelector('input[placeholder*="Owner"], input[name*="owner"], #ownerSearch', { timeout: 10000 })

      // Find owner search input (different selectors for different counties)
      const ownerInput = await page.locator('input[placeholder*="Owner"], input[name*="owner"], #ownerSearch').first()
      await ownerInput.fill(ownerName)

      // Submit search
      const searchButton = await page.locator('button:has-text("Search"), input[type="submit"][value*="Search"], .search-button').first()
      await searchButton.click()

      // Wait for results
      await page.waitForTimeout(3000)

      // Extract results
      await this.extractPropertyResults(page, county, properties)
    } catch (error) {
      console.error(`Error performing owner search for ${county}:`, error)
    }
  }

  private async performAddressSearch(page: Page, address: string, county: string, properties: PropertyRecord[]): Promise<void> {
    try {
      // Wait for search form
      await page.waitForSelector('input[placeholder*="Address"], input[name*="address"], #addressSearch', { timeout: 10000 })

      // Find address search input
      const addressInput = await page.locator('input[placeholder*="Address"], input[name*="address"], #addressSearch').first()
      await addressInput.fill(address)

      // Submit search
      const searchButton = await page.locator('button:has-text("Search"), input[type="submit"][value*="Search"], .search-button').first()
      await searchButton.click()

      // Wait for results
      await page.waitForTimeout(3000)

      // Extract results
      await this.extractPropertyResults(page, county, properties)
    } catch (error) {
      console.error(`Error performing address search for ${county}:`, error)
    }
  }

  private async extractPropertyResults(page: Page, county: string, properties: PropertyRecord[]): Promise<void> {
    try {
      // Common selectors for property result tables
      const resultRows = await page.$$('table tr:not(:first-child), .property-result, .search-result')

      for (const row of resultRows) {
        try {
          const property = await this.extractPropertyFromRow(row, page, county)
          if (property) {
            properties.push(property)
          }
        } catch (error) {
          console.error('Error extracting property from row:', error)
          continue
        }
      }

      // Handle pagination if exists
      const nextButton = await page.$('a:has-text("Next"), .next-page, [title*="Next"]')
      if (nextButton) {
        await nextButton.click()
        await page.waitForTimeout(2000)
        await this.extractPropertyResults(page, county, properties)
      }
    } catch (error) {
      console.error('Error extracting property results:', error)
    }
  }

  private async extractPropertyFromRow(row: any, page: Page, county: string): Promise<PropertyRecord | null> {
    try {
      // Extract basic info from row
      const cells = await row.$$('td')
      if (cells.length === 0) return null

      let parcelId = ''
      let situsAddress = ''
      let currentOwner = ''

      // Different counties have different table structures
      if (cells.length >= 3) {
        parcelId = (await cells[0].textContent())?.trim() || ''
        situsAddress = (await cells[1].textContent())?.trim() || ''
        currentOwner = (await cells[2].textContent())?.trim() || ''
      }

      if (!parcelId || !currentOwner) return null

      // Get detailed property info by clicking the parcel link
      const parcelLink = await row.$('a')
      if (parcelLink) {
        const href = await parcelLink.getAttribute('href')
        if (href) {
          const detailsUrl = href.startsWith('http') ? href : `${page.url().split('/').slice(0, 3).join('/')}${href}`
          const details = await this.extractPropertyDetails(page, detailsUrl)
          
          return {
            parcelId,
            county,
            situsAddress: details.situsAddress || situsAddress,
            taxMailingAddress: details.taxMailingAddress,
            currentOwner: details.currentOwner || currentOwner,
            lastSaleDate: details.lastSaleDate,
            assessedValue: details.assessedValue,
            legalDescription: details.legalDescription,
            qpublicUrl: detailsUrl
          }
        }
      }

      // Fallback if no detail link
      return {
        parcelId,
        county,
        situsAddress,
        currentOwner,
        qpublicUrl: page.url()
      }
    } catch (error) {
      console.error('Error extracting property from row:', error)
      return null
    }
  }

  private async extractPropertyDetails(page: Page, detailUrl: string): Promise<Partial<PropertyRecord>> {
    try {
      await page.goto(detailUrl, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)

      const details: Partial<PropertyRecord> = {}

      // Extract situs address
      const situsElement = await page.$('*:has-text("Situs Address"), *:has-text("Property Address")')
      if (situsElement) {
        const situsText = await situsElement.textContent()
        details.situsAddress = this.cleanText(situsText)
      }

      // Extract tax mailing address
      const mailingElement = await page.$('*:has-text("Mailing Address"), *:has-text("Tax Address")')
      if (mailingElement) {
        const mailingText = await mailingElement.textContent()
        details.taxMailingAddress = this.cleanText(mailingText)
      }

      // Extract current owner
      const ownerElement = await page.$('*:has-text("Owner"), *:has-text("Current Owner")')
      if (ownerElement) {
        const ownerText = await ownerElement.textContent()
        details.currentOwner = this.cleanText(ownerText)
      }

      // Extract last sale date
      const saleElement = await page.$('*:has-text("Sale Date"), *:has-text("Last Sale")')
      if (saleElement) {
        const saleText = await saleElement.textContent()
        const saleDate = this.parseDate(saleText)
        if (saleDate) details.lastSaleDate = saleDate
      }

      // Extract assessed value
      const valueElement = await page.$('*:has-text("Assessed Value"), *:has-text("Total Value")')
      if (valueElement) {
        const valueText = await valueElement.textContent()
        const value = this.parseValue(valueText)
        if (value) details.assessedValue = value
      }

      // Extract legal description
      const legalElement = await page.$('*:has-text("Legal Description"), textarea')
      if (legalElement) {
        const legalText = await legalElement.textContent()
        details.legalDescription = this.cleanText(legalText)
      }

      return details
    } catch (error) {
      console.error('Error extracting property details:', error)
      return {}
    }
  }

  private cleanText(text: string | null): string | undefined {
    if (!text) return undefined
    return text.replace(/[\r\n\t]+/g, ' ').trim() || undefined
  }

  private parseDate(text: string | null): Date | undefined {
    if (!text) return undefined
    const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)
    if (dateMatch) {
      const date = new Date(dateMatch[0])
      return isNaN(date.getTime()) ? undefined : date
    }
    return undefined
  }

  private parseValue(text: string | null): number | undefined {
    if (!text) return undefined
    const valueMatch = text.match(/\$?([0-9,]+(?:\.[0-9]{2})?)/)
    if (valueMatch) {
      const value = parseFloat(valueMatch[1].replace(/,/g, ''))
      return isNaN(value) ? undefined : value
    }
    return undefined
  }
}