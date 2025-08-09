import { NextRequest, NextResponse } from 'next/server'
import { VercelCompatibleScraper } from '@/services/scrapers/vercel-compatible-scraper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Debug endpoint without rate limiting
export async function GET(request: NextRequest) {
  try {
    console.log('Starting debug scraper test...')
    
    // Always create scraper for debugging
    const scraper = new VercelCompatibleScraper()

    console.log('Scraper created, attempting to scrape...')
    
    // Try to scrape some data
    const results = await scraper.scrape()
    
    console.log('Scraping completed, results:', results.length)
    
    return NextResponse.json({
      success: true,
      scraperAvailable: true,
      resultsCount: results.length,
      results: results,
      environment: {
        vercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV
      }
    })

  } catch (error) {
    console.error('Debug scraper failed:', error)
    
    return NextResponse.json({
      error: 'Scraper failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      environment: {
        vercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
}