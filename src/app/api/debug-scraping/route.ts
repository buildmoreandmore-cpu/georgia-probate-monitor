import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    console.log('=== DEBUG SCRAPING ENDPOINT ===')
    
    // Test 1: Basic environment check
    console.log('Environment check...')
    const envCheck = {
      nodeEnv: process.env.NODE_ENV,
      database: !!process.env.DATABASE_URL,
      vercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV
    }
    console.log('Environment:', envCheck)
    
    // Test 2: Database connection
    console.log('Testing database connection...')
    let dbTest = null
    let dbError = null
    
    try {
      const count = await prisma.case.count()
      dbTest = { success: true, caseCount: count }
      console.log('Database test passed:', dbTest)
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error)
      console.error('Database test failed:', dbError)
    }
    
    // Test 3: HTTP Scraper import and basic functionality
    console.log('Testing HTTP scraper import...')
    let scraperTest = null
    let scraperError = null
    
    try {
      const { HttpScraper } = await import('@/services/scrapers/http-scraper')
      const scraper = new HttpScraper()
      console.log('HTTP scraper imported successfully')
      
      // Test scraper functionality
      const testCases = await scraper.scrapeGeorgiaProbateRecords()
      scraperTest = {
        success: true,
        casesGenerated: testCases.length,
        sampleCase: testCases[0] ? {
          caseId: testCases[0].caseId,
          decedentName: testCases[0].decedentName,
          county: testCases[0].county
        } : null
      }
      console.log('Scraper test passed:', scraperTest)
      
    } catch (error) {
      scraperError = error instanceof Error ? error.message : String(error)
      console.error('Scraper test failed:', scraperError)
    }
    
    // Test 4: Database write test
    console.log('Testing database write...')
    let writeTest = null
    let writeError = null
    
    if (scraperTest && scraperTest.casesGenerated > 0) {
      try {
        const { HttpScraper } = await import('@/services/scrapers/http-scraper')
        const scraper = new HttpScraper()
        const testCases = await scraper.scrapeGeorgiaProbateRecords()
        const testCase = testCases[0]
        
        // Try to save one test case
        const savedCase = await prisma.case.create({
          data: {
            caseId: `DEBUG-${Date.now()}`,
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
        
        writeTest = {
          success: true,
          savedCaseId: savedCase.id,
          savedCaseNumber: savedCase.caseNumber
        }
        console.log('Database write test passed:', writeTest)
        
      } catch (error) {
        writeError = error instanceof Error ? error.message : String(error)
        console.error('Database write test failed:', writeError)
      }
    }
    
    return NextResponse.json({
      success: !dbError && !scraperError && !writeError,
      timestamp: new Date().toISOString(),
      tests: {
        environment: envCheck,
        database: {
          success: !dbError,
          result: dbTest,
          error: dbError
        },
        scraper: {
          success: !scraperError,
          result: scraperTest,
          error: scraperError
        },
        databaseWrite: {
          success: !writeError,
          result: writeTest,
          error: writeError
        }
      }
    })
    
  } catch (error) {
    console.error('Debug endpoint failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}