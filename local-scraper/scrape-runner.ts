#!/usr/bin/env tsx

import { HybridPlaywrightScraper } from './playwright-hybrid-scraper'
import { config } from 'dotenv'

// Load environment variables
config()

async function main() {
  console.log('🤖 Georgia Probate Monitor - Local Scraper')
  console.log('==========================================\n')

  const scraper = new HybridPlaywrightScraper(
    process.env.VERCEL_URL || 'https://georgia-probate-monitor.vercel.app'
  )

  try {
    await scraper.initialize()

    // Get command line arguments
    const args = process.argv.slice(2)
    const sites = args.length > 0 ? args : ['georgia_probate_records']
    
    console.log(`🎯 Target sites: ${sites.join(', ')}`)
    console.log(`📅 Searching for today's filings...\n`)

    await scraper.scrapeAndUpload(sites)

    console.log('\n✅ Scraping completed successfully!')

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