#!/usr/bin/env tsx

import { HybridPlaywrightScraper, ScrapedCase } from './playwright-hybrid-scraper'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables
config()

class FileScraper extends HybridPlaywrightScraper {
  private casesFile = '../src/data/scraped-cases.json'
  private casesDir = '../src/data'

  constructor() {
    super() // No API URL needed
    
    // Ensure data directory exists
    if (!existsSync(this.casesDir)) {
      mkdirSync(this.casesDir, { recursive: true })
    }
  }

  // Override the uploadCasesToVercel method to save to JSON file
  protected async uploadCasesToVercel(cases: ScrapedCase[]): Promise<void> {
    if (cases.length === 0) {
      console.log('📭 No cases to save to file')
      return
    }

    console.log(`💾 Saving ${cases.length} cases to JSON file...`)

    try {
      // Read existing cases
      let existingCases: any[] = []
      if (existsSync(this.casesFile)) {
        try {
          const existingData = readFileSync(this.casesFile, 'utf-8')
          existingCases = JSON.parse(existingData)
        } catch (error) {
          console.warn('Could not read existing cases file, creating new one')
          existingCases = []
        }
      }

      // Convert scraped cases to the format expected by cases page
      const newCases = cases.map((scrapedCase, index) => ({
        id: `scraped-${Date.now()}-${index}`,
        caseId: scrapedCase.caseId,
        county: scrapedCase.county,
        filingDate: scrapedCase.filingDate.toISOString(),
        caseNumber: scrapedCase.caseNumber,
        decedentName: scrapedCase.decedentName,
        decedentAddress: scrapedCase.decedentAddress,
        estateValue: scrapedCase.estateValue ? parseFloat(scrapedCase.estateValue.toString()) : undefined,
        status: 'active',
        contacts: [
          scrapedCase.petitioner && {
            id: `contact-${index}-1`,
            type: 'petitioner',
            name: scrapedCase.petitioner
          },
          scrapedCase.executor && {
            id: `contact-${index}-2`,
            type: 'executor',
            name: scrapedCase.executor
          },
          scrapedCase.administrator && {
            id: `contact-${index}-3`,
            type: 'administrator', 
            name: scrapedCase.administrator
          }
        ].filter(Boolean),
        parcels: scrapedCase.properties?.map((prop, propIndex) => ({
          id: `parcel-${index}-${propIndex}`,
          situsAddress: prop.situsAddress,
          assessedValue: prop.taxMailingAddress ? 100000 : undefined // Mock assessed value
        })) || []
      }))

      // Filter out duplicates based on caseId
      const allCases = [...existingCases]
      for (const newCase of newCases) {
        const exists = allCases.find(existing => existing.caseId === newCase.caseId)
        if (!exists) {
          allCases.push(newCase)
          console.log(`✅ Added new case: ${newCase.caseId} - ${newCase.decedentName}`)
        } else {
          console.log(`⏭️  Case ${newCase.caseId} already exists, skipping...`)
        }
      }

      // Save to file
      writeFileSync(this.casesFile, JSON.stringify(allCases, null, 2))
      console.log(`🎉 Successfully saved ${allCases.length} total cases to ${this.casesFile}!`)

    } catch (error) {
      console.error('❌ Error saving cases to file:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    await super.cleanup()
  }
}

async function main() {
  console.log('🤖 Georgia Probate Monitor - File Scraper')
  console.log('=======================================\n')

  const scraper = new FileScraper()

  try {
    await scraper.initialize()

    // Get command line arguments
    const args = process.argv.slice(2)
    const sites = args.length > 0 ? args : ['georgia_probate_records']
    
    console.log(`🎯 Target sites: ${sites.join(', ')}`)
    console.log(`💾 Saving to JSON file...\n`)

    await scraper.scrapeAndUpload(sites)

    console.log('\n✅ Scraping and file save completed successfully!')

  } catch (error) {
    console.error('\n❌ Scraping failed:', error)
    process.exit(1)
  } finally {
    await scraper.cleanup()
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received interrupt signal, cleaning up...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received terminate signal, cleaning up...')
  process.exit(0)
})

main().catch(console.error)