import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE SCRAPE TEST ===')
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: !!process.env.DATABASE_URL,
      VERCEL: !!process.env.VERCEL
    })
    
    // Import and test the HTTP scraper
    const { HttpScraper } = await import('@/services/scrapers/http-scraper')
    const scraper = new HttpScraper()
    
    console.log('HTTP Scraper imported successfully')
    
    // Generate test cases
    const testCases = await scraper.scrapeGeorgiaProbateRecords()
    console.log(`Generated ${testCases.length} test cases`)
    
    if (testCases.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No test cases generated',
        error: 'Scraper returned empty results'
      }, { status: 500 })
    }
    
    // Try to save one case to test database
    const testCase = testCases[0]
    console.log('Attempting to save test case:', testCase.decedentName)
    
    const savedCase = await prisma.case.create({
      data: {
        caseId: testCase.caseId,
        county: testCase.county,
        filingDate: testCase.filingDate,
        decedentName: testCase.decedentName,
        decedentAddress: testCase.decedentAddress,
        estateValue: testCase.estateValue,
        caseNumber: testCase.caseNumber,
        attorney: testCase.attorney,
        courtUrl: testCase.courtUrl
      }
    })
    
    console.log('Successfully saved case:', savedCase.id)
    
    // Save contacts
    if (testCase.petitioner) {
      await prisma.contact.create({
        data: {
          caseId: savedCase.id,
          type: 'petitioner',
          name: testCase.petitioner
        }
      })
      console.log('Saved petitioner contact')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simple scrape test successful',
      result: {
        casesGenerated: testCases.length,
        savedCase: {
          id: savedCase.id,
          caseNumber: savedCase.caseNumber,
          decedentName: savedCase.decedentName,
          county: savedCase.county
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Simple scrape test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Simple scrape test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}