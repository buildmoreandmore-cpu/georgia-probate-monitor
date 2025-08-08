import { Page } from 'playwright'
import { BaseScraper, ScrapedCase, ScrapedContact } from './base-scraper'

export class CobbProbateScraper extends BaseScraper {
  private baseUrl = 'https://probateonline.cobbcounty.org/BenchmarkWeb/Home.aspx/Search'

  async scrape(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]> {
    const page = await this.createPage()
    const cases: ScrapedCase[] = []

    try {
      await this.retryOperation(async () => {
        await page.goto(this.baseUrl, { waitUntil: 'networkidle' })
      })

      // Wait for the search form to load
      await page.waitForSelector('#caseNumberInput', { timeout: 10000 })

      // Perform a broad search to get recent cases
      if (dateFrom) {
        await page.fill('#filingDateFrom', this.formatDate(dateFrom))
      }
      if (dateTo) {
        await page.fill('#filingDateTo', this.formatDate(dateTo))
      }

      // Select estate case types
      await page.selectOption('#caseTypeSelect', ['EST', 'ADM'])

      // Submit search
      await page.click('#searchButton')
      await page.waitForSelector('.search-results-table', { timeout: 15000 })

      // Extract results
      const resultRows = await page.$$('.search-results-table tbody tr')

      for (const row of resultRows) {
        try {
          const cells = await row.$$('td')
          if (cells.length < 5) continue

          const caseNumber = await cells[0].textContent() || ''
          const caseType = await cells[1].textContent() || ''
          const filingDateStr = await cells[2].textContent() || ''
          const parties = await cells[3].textContent() || ''
          const status = await cells[4].textContent() || ''

          // Skip non-estate cases
          if (!caseType.includes('EST') && !caseType.includes('ADM')) continue

          const filingDate = this.parseDate(filingDateStr)
          
          // Extract decedent name from parties string
          const decedentName = this.extractDecedentName(parties)
          if (!decedentName) continue

          // Get case details
          const caseLink = await cells[0].$('a')
          const caseDetailUrl = await caseLink?.getAttribute('href')
          
          const { contacts, attorney, estateValue, decedentAddress } = await this.extractCaseDetails(page, caseDetailUrl)

          const scrapedCase: ScrapedCase = {
            caseId: caseNumber.trim(),
            county: 'cobb',
            filingDate,
            decedentName,
            decedentAddress,
            estateValue,
            caseNumber: caseNumber.trim(),
            attorney,
            courtUrl: caseDetailUrl ? `https://probateonline.cobbcounty.org${caseDetailUrl}` : undefined,
            contacts
          }

          cases.push(scrapedCase)
          await this.delay()
        } catch (error) {
          console.error('Error processing Cobb case row:', error)
          continue
        }
      }

      return cases
    } finally {
      await page.close()
    }
  }

  private async extractCaseDetails(page: Page, detailUrl?: string): Promise<{
    contacts: ScrapedContact[]
    attorney?: string
    estateValue?: number
    decedentAddress?: string
  }> {
    const contacts: ScrapedContact[] = []
    let attorney: string | undefined
    let estateValue: number | undefined
    let decedentAddress: string | undefined

    if (!detailUrl) return { contacts }

    try {
      await page.goto(`https://probateonline.cobbcounty.org${detailUrl}`, { 
        waitUntil: 'networkidle' 
      })

      // Extract parties information
      const partiesSection = await page.$('.parties-section')
      if (partiesSection) {
        const partyRows = await partiesSection.$$('.party-row')
        
        for (const row of partyRows) {
          const roleElement = await row.$('.party-role')
          const nameElement = await row.$('.party-name')
          const addressElement = await row.$('.party-address')
          
          if (!roleElement || !nameElement) continue

          const role = await roleElement.textContent()
          const name = await nameElement.textContent()
          const address = await addressElement?.textContent()

          if (role && name) {
            const roleType = this.mapRoleToContactType(role.trim())
            if (roleType) {
              contacts.push({
                type: roleType,
                name: name.trim(),
                address: address?.trim()
              })
            }
          }
        }
      }

      // Extract attorney information
      const attorneyElement = await page.$('.attorney-info .attorney-name')
      if (attorneyElement) {
        attorney = await attorneyElement.textContent() || undefined
      }

      // Extract estate value
      const estateValueElement = await page.$('.estate-value')
      if (estateValueElement) {
        const valueText = await estateValueElement.textContent() || ''
        estateValue = this.parseEstateValue(valueText)
      }

      // Extract decedent address
      const decedentAddressElement = await page.$('.decedent-address')
      if (decedentAddressElement) {
        decedentAddress = await decedentAddressElement.textContent() || undefined
      }

    } catch (error) {
      console.error('Error extracting case details:', error)
    }

    return { contacts, attorney, estateValue, decedentAddress }
  }

  private extractDecedentName(parties: string): string | undefined {
    // Parse party string to find decedent name
    const patterns = [
      /Estate of (.+?)(?:,|$)/i,
      /In re:?\s+(.+?)(?:,|$)/i,
      /(.+?)\s+(?:Estate|Deceased)/i
    ]

    for (const pattern of patterns) {
      const match = parties.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return undefined
  }

  private mapRoleToContactType(role: string): 'executor' | 'administrator' | 'petitioner' | undefined {
    const roleLower = role.toLowerCase()
    
    if (roleLower.includes('executor') || roleLower.includes('personal representative')) {
      return 'executor'
    }
    if (roleLower.includes('administrator')) {
      return 'administrator'
    }
    if (roleLower.includes('petitioner') || roleLower.includes('applicant')) {
      return 'petitioner'
    }
    
    return undefined
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