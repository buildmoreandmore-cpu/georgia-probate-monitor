// Vercel-compatible scraper using fetch instead of browser automation
import { ScrapedCase, ScrapedContact } from './base-scraper'

export class VercelCompatibleScraper {
  async scrape(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]> {
    console.log('Running Vercel-compatible scraper...')
    
    const cases: ScrapedCase[] = []
    
    try {
      // Try to scrape Georgia Probate Records using direct HTTP requests
      const georgiaCases = await this.scrapeGeorgiaProbateRecords(dateFrom, dateTo)
      cases.push(...georgiaCases)
      
      // Note: Cobb County site likely requires more complex interaction
      // For now, we'll focus on Georgia Probate Records which might work with HTTP requests
      
      console.log(`Scraped ${georgiaCases.length} cases from Georgia Probate Records`)
      
    } catch (error) {
      console.warn('Direct HTTP scraping failed, returning demo data:', error)
      
      // Fallback to demo data
      const demoCase: ScrapedCase = {
        caseId: `DEMO-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        county: 'cobb',
        filingDate: new Date(),
        decedentName: 'Demo Decedent',
        decedentAddress: '123 Demo St, Marietta, GA 30060',
        estateValue: 150000,
        caseNumber: `${new Date().getFullYear()}-DEMO-${Math.floor(Math.random() * 1000)}`,
        attorney: 'Demo Attorney, Esq.',
        courtUrl: 'https://example.com/demo-case',
        contacts: [
          {
            type: 'executor',
            name: 'Demo Executor',
            address: '456 Executor Ave, Marietta, GA 30062'
          }
        ]
      }
      
      cases.push(demoCase)
    }
    
    return cases
  }

  private async scrapeGeorgiaProbateRecords(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]> {
    // Attempt to scrape using direct HTTP requests
    // This may not work if the site requires complex JavaScript interaction
    
    const baseUrl = 'https://georgiaprobaterecords.com/Estates/SearchEstates.aspx'
    const cases: ScrapedCase[] = []
    
    try {
      // First, get the page to extract ViewState and other required form data
      const initialResponse = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      if (!initialResponse.ok) {
        throw new Error(`Failed to fetch initial page: ${initialResponse.status}`)
      }
      
      const html = await initialResponse.text()
      
      // Extract ASP.NET ViewState and other required fields - corrected selectors
      const viewStateMatch = html.match(/id="__VIEWSTATE" value="([^"]*)"/)
      const eventValidationMatch = html.match(/id="__EVENTVALIDATION" value="([^"]*)"/)
      const viewStateGeneratorMatch = html.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/)
      
      if (!viewStateMatch || !eventValidationMatch) {
        throw new Error('Could not extract required form data from page')
      }
      
      console.log('Extracted form tokens successfully')
      
      // Prepare form data for search - corrected field names
      const formData = new URLSearchParams()
      formData.append('__VIEWSTATE', viewStateMatch[1])
      formData.append('__EVENTVALIDATION', eventValidationMatch[1])
      if (viewStateGeneratorMatch) {
        formData.append('__VIEWSTATEGENERATOR', viewStateGeneratorMatch[1])
      }
      
      // Add search fields with correct naming
      formData.append('ctl00$cpMain$ddlCounty', '') // All counties
      formData.append('ctl00$cpMain$txtFirstName', '')
      formData.append('ctl00$cpMain$txtLastName', '')
      formData.append('ctl00$cpMain$txtFromDate', '') 
      formData.append('ctl00$cpMain$txtToDate', '')
      
      // Set date range for recent cases
      if (dateFrom) {
        formData.append('ctl00$cpMain$txtFiledFromDate', this.formatDate(dateFrom))
      } else {
        formData.append('ctl00$cpMain$txtFiledFromDate', '01/01/2024') // Default to recent cases
      }
      if (dateTo) {
        formData.append('ctl00$cpMain$txtFiledToDate', this.formatDate(dateTo))
      } else {
        formData.append('ctl00$cpMain$txtFiledToDate', '')
      }
      
      formData.append('ctl00$cpMain$btnSearch', 'Search')
      
      // Submit the search
      const searchResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': baseUrl
        },
        body: formData.toString()
      })
      
      if (!searchResponse.ok) {
        throw new Error(`Search request failed: ${searchResponse.status}`)
      }
      
      const searchHtml = await searchResponse.text()
      
      // Simple regex-based parsing since Cheerio has compatibility issues
      console.log('Attempting to parse HTML response...')
      console.log('Response length:', searchHtml.length)
      console.log('Response preview:', searchHtml.substring(0, 500))
      
      // Look for the specific results table - the site might use RadGrid
      // Check for different possible table patterns
      const tableMatches = searchHtml.match(/<tr[^>]*>.*?<\/tr>/gi) || []
      const radGridMatches = searchHtml.match(/RadGrid[^>]*>/gi) || []
      const resultMatches = searchHtml.match(/result[^>]*>/gi) || []
      
      console.log('Table matches found:', tableMatches.length)
      console.log('RadGrid matches found:', radGridMatches.length) 
      console.log('Result matches found:', resultMatches.length)
      
      // Check if we have a "no results" message
      if (searchHtml.includes('No records') || searchHtml.includes('no results') || searchHtml.includes('0 records')) {
        console.log('No records found message detected')
        return cases
      }
      
      if (tableMatches && tableMatches.length > 1) { // Skip header row
        console.log(`Found ${tableMatches.length - 1} potential data rows`)
        
        for (let i = 1; i < Math.min(tableMatches.length, 11); i++) { // Limit to 10 results for testing
          try {
            const row = tableMatches[i]
            const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gi)
            
            if (cellMatches && cellMatches.length >= 3) {
              // Extract text content from cells
              const cells = cellMatches.map(cell => 
                cell.replace(/<[^>]*>/g, '').trim()
              )
              
              const caseNumber = cells[0]
              const decedentName = cells[1]
              const filingDateStr = cells[2]
              
              if (caseNumber && decedentName && filingDateStr) {
                const filingDate = this.parseDate(filingDateStr)
                
                if (filingDate) {
                  const scrapedCase: ScrapedCase = {
                    caseId: `GPR-${Date.now()}-${i}`, // Use timestamp to ensure uniqueness
                    county: 'georgia', // Default county for Georgia Probate Records
                    filingDate: filingDate,
                    decedentName: decedentName,
                    caseNumber: caseNumber,
                    contacts: []
                  }
                  
                  cases.push(scrapedCase)
                }
              }
            }
          } catch (rowError) {
            console.warn('Error parsing row:', rowError)
          }
        }
      } else {
        console.log('No table data found in response')
      }
      
      console.log(`Successfully parsed ${cases.length} cases from Georgia Probate Records`)
      
    } catch (error) {
      console.warn('HTTP scraping failed:', error)
      throw error
    }
    
    return cases
  }
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    })
  }
  
  private parseDate(dateString: string): Date | null {
    if (!dateString) return null
    
    try {
      // Try common date formats
      const parsed = new Date(dateString)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
      
      // Try MM/DD/YYYY format
      const mmddyyyy = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (mmddyyyy) {
        return new Date(parseInt(mmddyyyy[3]), parseInt(mmddyyyy[1]) - 1, parseInt(mmddyyyy[2]))
      }
      
      return null
    } catch (error) {
      console.warn('Error parsing date:', dateString, error)
      return null
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for serverless
  }
}

export function createVercelScraper() {
  // In production Vercel environment, use the compatible scraper
  if (process.env.VERCEL) {
    return new VercelCompatibleScraper()
  }
  
  // In development or Docker, use the full Playwright scrapers
  return null
}