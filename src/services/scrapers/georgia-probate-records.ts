import { Page } from 'playwright'
import { BaseScraper, ScrapedCase, ScrapedContact } from './base-scraper'

export class GeorgiaProbateRecordsScraper extends BaseScraper {
  private baseUrl = 'https://georgiaprobaterecords.com/Estates/SearchEstates.aspx'

  async scrape(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]> {
    const page = await this.createPage()
    const cases: ScrapedCase[] = []

    try {
      await this.retryOperation(async () => {
        await page.goto(this.baseUrl, { waitUntil: 'networkidle' })
      })

      // Set date range if provided
      if (dateFrom) {
        await page.fill('#ctl00_ContentPlaceHolder1_txtFromDate', this.formatDate(dateFrom))
      }
      if (dateTo) {
        await page.fill('#ctl00_ContentPlaceHolder1_txtToDate', this.formatDate(dateTo))
      }

      // Submit search
      await page.click('#ctl00_ContentPlaceHolder1_btnSearch')
      await page.waitForSelector('#ctl00_ContentPlaceHolder1_gvEstates', { timeout: 10000 })

      // Extract data from results table
      const rows = await page.$$('#ctl00_ContentPlaceHolder1_gvEstates tr:not(:first-child)')

      for (const row of rows) {
        try {
          const cells = await row.$$('td')
          if (cells.length < 6) continue

          const caseNumber = await cells[0].textContent() || ''
          const decedentName = await cells[1].textContent() || ''
          const county = await cells[2].textContent() || ''
          const filingDateStr = await cells[3].textContent() || ''
          const attorney = await cells[4].textContent() || ''
          const estateValueStr = await cells[5].textContent() || ''

          const filingDate = this.parseDate(filingDateStr)
          const estateValue = this.parseEstateValue(estateValueStr)

          // Get case details by clicking the link
          const caseLink = await cells[0].$('a')
          const caseUrl = await caseLink?.getAttribute('href')

          const contacts = await this.extractContacts(page, caseUrl || undefined)

          const scrapedCase: ScrapedCase = {
            caseId: caseNumber.trim(),
            county: county.trim().toLowerCase(),
            filingDate,
            decedentName: decedentName.trim(),
            estateValue,
            caseNumber: caseNumber.trim(),
            attorney: attorney.trim() || undefined,
            courtUrl: caseUrl ? `${this.baseUrl}${caseUrl}` : undefined,
            contacts
          }

          cases.push(scrapedCase)
          await this.delay() // Respect rate limiting
        } catch (error) {
          console.error('Error processing row:', error)
          continue
        }
      }

      return cases
    } finally {
      await page.close()
    }
  }

  private async extractContacts(page: Page, caseUrl?: string): Promise<ScrapedContact[]> {
    const contacts: ScrapedContact[] = []

    if (!caseUrl) return contacts

    try {
      // Navigate to case detail page
      await page.goto(`${this.baseUrl}${caseUrl}`, { waitUntil: 'networkidle' })
      
      // Extract executor/administrator info
      const executorElement = await page.$('#ctl00_ContentPlaceHolder1_lblExecutor')
      const administratorElement = await page.$('#ctl00_ContentPlaceHolder1_lblAdministrator')
      const petitionerElement = await page.$('#ctl00_ContentPlaceHolder1_lblPetitioner')

      if (executorElement) {
        const executorText = await executorElement.textContent()
        if (executorText && executorText.trim()) {
          contacts.push({
            type: 'executor',
            name: executorText.trim()
          })
        }
      }

      if (administratorElement) {
        const administratorText = await administratorElement.textContent()
        if (administratorText && administratorText.trim()) {
          contacts.push({
            type: 'administrator',
            name: administratorText.trim()
          })
        }
      }

      if (petitionerElement) {
        const petitionerText = await petitionerElement.textContent()
        if (petitionerText && petitionerText.trim()) {
          contacts.push({
            type: 'petitioner',
            name: petitionerText.trim()
          })
        }
      }
    } catch (error) {
      console.error('Error extracting contacts:', error)
    }

    return contacts
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    })
  }

  private parseDate(dateStr: string): Date {
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }

  private parseEstateValue(valueStr: string): number | undefined {
    const cleaned = valueStr.replace(/[^0-9.]/g, '')
    const value = parseFloat(cleaned)
    return isNaN(value) ? undefined : value
  }
}