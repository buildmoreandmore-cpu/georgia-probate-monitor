#!/usr/bin/env tsx

// Import Prisma from parent project
const { PrismaClient } = require('../node_modules/@prisma/client')
import { HybridPlaywrightScraper, ScrapedCase } from './playwright-hybrid-scraper'
import { config } from 'dotenv'
import dayjs from 'dayjs'

// Load environment variables
config() // Load from local-scraper/.env
config({ path: '../.env.local' }) // Load from parent directory
config({ path: '../.env.production' }) // Production config

const prisma = new PrismaClient()

/**
 * Helper function to determine if a case should be saved based on filing date and source
 * Rules:
 * - Georgia Probate Records: ONLY save if filing date matches exactly today's date
 * - QPublic Sites: Save if filing date is within the past 2 weeks
 */
function shouldSaveCase(filedDate?: Date, source?: string): boolean {
  if (!filedDate) return false
  
  const today = dayjs()
  const filed = dayjs(filedDate)
  
  // Determine source type
  const isQPublicSource = source?.startsWith('qpublic') || false
  
  if (isQPublicSource) {
    // QPublic property records - allow 2 week window
    const twoWeeksAgo = today.subtract(14, 'days')
    const isWithinRange = filed.isAfter(twoWeeksAgo) && filed.isBefore(today.add(1, 'day'))
    console.log(`📅 QPublic date check: ${filed.format('MM/DD/YYYY')} (${isWithinRange ? 'WITHIN' : 'OUTSIDE'} 2-week range)`)
    return isWithinRange
  } else {
    // Georgia Probate Records - only today's filings
    const isSameDay = filed.isSame(today, 'day')
    console.log(`📅 Probate date check: ${filed.format('MM/DD/YYYY')} (${isSameDay ? 'TODAY' : 'NOT TODAY'})`)
    return isSameDay
  }
}

class DatabaseScraper extends HybridPlaywrightScraper {
  private currentSite?: string
  
  constructor() {
    super() // No API URL needed
  }
  
  // Override scrapeAndUpload to track current site
  async scrapeAndUpload(sites: string[] = ['georgia_probate_records'], dateFrom?: Date): Promise<void> {
    for (const site of sites) {
      this.currentSite = site
      console.log(`\n📋 Starting scrape for ${site}...`)
      
      await super.scrapeAndUpload([site], dateFrom)
    }
  }

  // Override the uploadCasesToVercel method to save directly to database
  protected async uploadCasesToVercel(cases: ScrapedCase[]): Promise<void> {
    if (cases.length === 0) {
      console.log('📭 No cases to save to database')
      return
    }

    console.log(`💾 Saving ${cases.length} cases directly to database...`)

    try {
      // Filter cases that should be saved and don't exist yet
      const validCases = cases.filter(scrapedCase => 
        shouldSaveCase(scrapedCase.filingDate, this.currentSite)
      )
      
      if (validCases.length === 0) {
        console.log('⏭️  No cases within valid date range, skipping...')
        return
      }

      // Batch check for existing cases
      const caseIds = validCases.map(c => c.caseId)
      const existingCases = await prisma.case.findMany({
        where: { caseId: { in: caseIds } },
        select: { caseId: true }
      })
      const existingCaseIds = new Set(existingCases.map(c => c.caseId))

      // Filter out existing cases
      const newCases = validCases.filter(c => !existingCaseIds.has(c.caseId))
      
      if (newCases.length === 0) {
        console.log('⏭️  All cases already exist, skipping...')
        return
      }

      console.log(`💾 Processing ${newCases.length} new cases in bulk transaction...`)

      // Use a single transaction for all operations
      await prisma.$transaction(async (tx) => {
        // Prepare bulk case data
        const caseData = newCases.map(scrapedCase => ({
          caseId: scrapedCase.caseId,
          county: scrapedCase.county,
          filingDate: scrapedCase.filingDate,
          decedentName: scrapedCase.decedentName,
          decedentAddress: scrapedCase.decedentAddress,
          estateValue: scrapedCase.estateValue ? parseFloat(scrapedCase.estateValue.toString()) : null,
          caseNumber: scrapedCase.caseNumber,
          attorney: scrapedCase.executor || scrapedCase.administrator || scrapedCase.petitioner,
          status: 'active'
        }))

        // Bulk create cases
        const createdCases = await tx.case.createManyAndReturn({ data: caseData })
        console.log(`✅ Created ${createdCases.length} cases in bulk`)

        // Create lookup map for case IDs
        const caseIdMap = new Map(createdCases.map(c => [c.caseId, c.id]))

        // Prepare bulk contact data
        const contactData: Array<{caseId: string, type: string, name: string}> = []
        
        for (const scrapedCase of newCases) {
          const dbCaseId = caseIdMap.get(scrapedCase.caseId)
          if (!dbCaseId) continue

          if (scrapedCase.petitioner) {
            contactData.push({
              caseId: dbCaseId,
              type: 'petitioner',
              name: scrapedCase.petitioner
            })
          }

          if (scrapedCase.executor) {
            contactData.push({
              caseId: dbCaseId,
              type: 'executor',
              name: scrapedCase.executor
            })
          }

          if (scrapedCase.administrator) {
            contactData.push({
              caseId: dbCaseId,
              type: 'administrator',
              name: scrapedCase.administrator
            })
          }
        }

        // Bulk create contacts
        if (contactData.length > 0) {
          await tx.contact.createMany({ data: contactData })
          console.log(`✅ Created ${contactData.length} contacts in bulk`)
        }

        // Prepare bulk parcel data
        const parcelData: Array<{
          caseId: string
          parcelId: string
          county: string
          situsAddress?: string
          taxMailingAddress?: string
          currentOwner?: string
          qpublicUrl?: string
          matchConfidence: number
        }> = []

        for (const scrapedCase of newCases) {
          const dbCaseId = caseIdMap.get(scrapedCase.caseId)
          if (!dbCaseId) continue

          for (const property of scrapedCase.properties || []) {
            parcelData.push({
              caseId: dbCaseId,
              parcelId: property.parcelId,
              county: scrapedCase.county,
              situsAddress: property.situsAddress,
              taxMailingAddress: property.taxMailingAddress,
              currentOwner: property.currentOwner,
              qpublicUrl: property.qpublicUrl,
              matchConfidence: 0.8
            })
          }
        }

        // Bulk create parcels
        if (parcelData.length > 0) {
          await tx.parcel.createMany({ data: parcelData })
          console.log(`✅ Created ${parcelData.length} parcels in bulk`)
        }
      })

      console.log(`🎉 Successfully saved ${newCases.length} cases to database using bulk operations!`)

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