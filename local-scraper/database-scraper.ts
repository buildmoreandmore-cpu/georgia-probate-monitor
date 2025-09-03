#!/usr/bin/env tsx

// Import Prisma from parent project
const { PrismaClient } = require('../node_modules/@prisma/client')
import { HybridPlaywrightScraper, ScrapedCase } from './playwright-hybrid-scraper'
import { config } from 'dotenv'

// Load environment variables
config() // Load from local-scraper/.env
config({ path: '../.env.local' }) // Load from parent directory
config({ path: '../.env.production' }) // Production config

const prisma = new PrismaClient()

class DatabaseScraper extends HybridPlaywrightScraper {
  constructor() {
    super() // No API URL needed
  }

  // Override the uploadCasesToVercel method to save directly to database
  protected async uploadCasesToVercel(cases: ScrapedCase[]): Promise<void> {
    if (cases.length === 0) {
      console.log('📭 No cases to save to database')
      return
    }

    console.log(`💾 Saving ${cases.length} cases directly to database...`)

    try {
      for (const scrapedCase of cases) {
        // Check if case already exists
        const existingCase = await prisma.case.findUnique({
          where: { caseId: scrapedCase.caseId }
        })

        if (existingCase) {
          console.log(`⏭️  Case ${scrapedCase.caseId} already exists, skipping...`)
          continue
        }

        // Create the case
        const savedCase = await prisma.case.create({
          data: {
            caseId: scrapedCase.caseId,
            county: scrapedCase.county,
            filingDate: scrapedCase.filingDate,
            decedentName: scrapedCase.decedentName,
            decedentAddress: scrapedCase.decedentAddress,
            estateValue: scrapedCase.estateValue ? parseFloat(scrapedCase.estateValue.toString()) : null,
            caseNumber: scrapedCase.caseNumber,
            attorney: scrapedCase.executor || scrapedCase.administrator || scrapedCase.petitioner,
            courtUrl: scrapedCase.courtUrl,
            status: 'active'
          }
        })

        console.log(`✅ Saved case: ${savedCase.caseId} - ${scrapedCase.decedentName}`)

        // Save contacts
        if (scrapedCase.petitioner) {
          await prisma.contact.create({
            data: {
              caseId: savedCase.id,
              type: 'petitioner',
              name: scrapedCase.petitioner
            }
          })
        }

        if (scrapedCase.executor) {
          await prisma.contact.create({
            data: {
              caseId: savedCase.id,
              type: 'executor', 
              name: scrapedCase.executor
            }
          })
        }

        if (scrapedCase.administrator) {
          await prisma.contact.create({
            data: {
              caseId: savedCase.id,
              type: 'administrator',
              name: scrapedCase.administrator
            }
          })
        }

        // Save properties
        for (const property of scrapedCase.properties || []) {
          await prisma.parcel.create({
            data: {
              caseId: savedCase.id,
              parcelId: property.parcelId,
              county: scrapedCase.county,
              situsAddress: property.situsAddress,
              taxMailingAddress: property.taxMailingAddress,
              currentOwner: property.currentOwner,
              qpublicUrl: property.qpublicUrl,
              matchConfidence: 0.8 // Default confidence for scraped data
            }
          })
        }
      }

      console.log(`🎉 Successfully saved ${cases.length} cases to database!`)

    } catch (error) {
      console.error('❌ Error saving cases to database:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    await super.cleanup()
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('🤖 Georgia Probate Monitor - Database Scraper')
  console.log('===========================================\n')

  const scraper = new DatabaseScraper()

  try {
    await scraper.initialize()

    // Get command line arguments
    const args = process.argv.slice(2)
    const sites = args.length > 0 ? args : ['georgia_probate_records']
    
    console.log(`🎯 Target sites: ${sites.join(', ')}`)
    console.log(`💾 Saving directly to database...\n`)

    await scraper.scrapeAndUpload(sites)

    console.log('\n✅ Scraping and database save completed successfully!')

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
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received terminate signal, cleaning up...')
  await prisma.$disconnect()
  process.exit(0)
})

main().catch(console.error)