// Vercel-compatible scraper that doesn't use Playwright in serverless environment
import { ScrapedCase, ScrapedContact } from './base-scraper'

export class VercelCompatibleScraper {
  async scrape(dateFrom?: Date, dateTo?: Date): Promise<ScrapedCase[]> {
    // In Vercel serverless environment, we'll return mock data or fetch from external APIs
    // This is because Playwright requires significant resources not available in serverless
    
    console.log('Running in serverless environment - returning sample data')
    
    // Return sample case data for demonstration
    const sampleCase: ScrapedCase = {
      caseId: 'DEMO-2024-001',
      county: 'cobb',
      filingDate: new Date('2024-01-15'),
      decedentName: 'Demo Decedent',
      decedentAddress: '123 Demo St, Marietta, GA 30060',
      estateValue: 150000,
      caseNumber: '24-DEMO-001',
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

    return [sampleCase]
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