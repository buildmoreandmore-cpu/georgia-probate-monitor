import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    console.log('Starting simplified scrape test...')
    
    // For Vercel deployment, we'll just return a test response
    // since the local scraper can't run in serverless environment
    return NextResponse.json({
      success: true,
      message: 'Scraper test endpoint is working. Use local scraper tool for actual scraping.',
      note: 'This is a test endpoint - the actual scraper runs locally via npm commands',
      localCommands: [
        'npm run scrape:georgia',
        'npm run scrape:cobb',
        'npm run scrape:all'
      ]
    })
    
  } catch (error) {
    console.error('Scrape test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to execute scraper',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}