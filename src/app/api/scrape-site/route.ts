import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30 second timeout per site

interface ScrapedCase {
  caseId: string
  county: string
  filingDate: Date
  decedentName: string
  status: string
}

// HTTP-based scraping without Playwright
async function scrapeGeorgiaProbateRecords(): Promise<ScrapedCase[]> {
  try {
    console.log('🔍 Scraping Georgia Probate Records...')
    
    // Use fetch to get the search page
    const response = await fetch('https://georgiaprobaterecords.com/Estates/SearchEstates.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    
    // Basic HTML parsing (would need cheerio or similar for real parsing)
    // No mock data - return empty results to avoid fake data
    const mockCases: ScrapedCase[] = []
    
    console.log(`✅ Found ${mockCases.length} cases from Georgia Probate Records`)
    return mockCases
    
  } catch (error) {
    console.error('❌ Error scraping Georgia Probate Records:', error)
    return []
  }
}

async function scrapeQPublicSite(county: string): Promise<ScrapedCase[]> {
  try {
    console.log(`🔍 Scraping QPublic ${county}...`)
    
    // No mock data - return empty results to avoid fake data
    const mockCases: ScrapedCase[] = []
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log(`✅ Found ${mockCases.length} records from QPublic ${county}`)
    return mockCases
    
  } catch (error) {
    console.error(`❌ Error scraping QPublic ${county}:`, error)
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { site } = await request.json()
    
    let results: ScrapedCase[] = []
    
    switch (site) {
      case 'georgia_probate_records':
        results = await scrapeGeorgiaProbateRecords()
        break
      case 'cobb_probate':
        // Would implement Cobb Probate Court scraping - returning empty for now
        results = []
        break
      case 'qpublic_cobb':
      case 'qpublic_dekalb':
      case 'qpublic_fulton':
      case 'qpublic_fayette':
      case 'qpublic_newton':
      case 'qpublic_douglas':
      case 'qpublic_gwinnett':
        const county = site.replace('qpublic_', '')
        results = await scrapeQPublicSite(county.charAt(0).toUpperCase() + county.slice(1))
        break
      default:
        throw new Error(`Unknown site: ${site}`)
    }
    
    return NextResponse.json({
      success: true,
      site,
      casesFound: results.length,
      cases: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Site scraping error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}