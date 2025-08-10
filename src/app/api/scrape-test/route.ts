import { NextResponse } from 'next/server'
import { SimpleScraper } from '@/services/scrapers/simple-scraper'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Starting scrape test...')
    
    const scraper = new SimpleScraper()
    const cases = await scraper.scrape()
    
    console.log(`Scraper returned ${cases.length} cases`)
    
    // Try to save one case to test database
    if (cases.length > 0) {
      const testCase = cases[0]
      
      try {
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
        
        console.log('Successfully saved test case to database')
        
        return NextResponse.json({
          success: true,
          message: 'Scraping and database save successful',
          scrapedCount: cases.length,
          savedCase: {
            id: (savedCase as any).id,
            caseNumber: (savedCase as any).caseNumber,
            decedentName: (savedCase as any).decedentName
          },
          allCases: cases.map(c => ({
            caseId: c.caseId,
            decedentName: c.decedentName,
            county: c.county,
            filingDate: c.filingDate,
            estateValue: c.estateValue
          }))
        })
        
      } catch (dbError) {
        console.error('Database save failed:', dbError)
        return NextResponse.json({
          success: false,
          message: 'Scraping worked but database save failed',
          scrapedCount: cases.length,
          dbError: dbError instanceof Error ? dbError.message : 'Unknown DB error',
          cases: cases.map(c => ({
            caseId: c.caseId,
            decedentName: c.decedentName,
            county: c.county
          }))
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Scraping worked but no cases returned',
      scrapedCount: cases.length
    })
    
  } catch (error) {
    console.error('Scrape test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Scraping completely failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}