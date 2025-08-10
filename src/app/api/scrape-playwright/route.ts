import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Skip only during build time, not runtime
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.VERCEL_ENV) {
    return NextResponse.json({
      success: false,
      message: 'Not available during build',
      error: 'Service unavailable during build process'
    }, { status: 503 })
  }
  
  // Use HTTP scraper for reliable serverless operation
  const { HttpScraper } = await import('@/services/scrapers/http-scraper')
  const scraper = new HttpScraper()
  
  try {
    const body = await request.json()
    const { sites = ['georgia_probate_records'], dateFrom } = body
    
    console.log('Starting HTTP scraping for sites:', sites)
    
    const allCases = []
    
    for (const site of sites) {
      console.log(`Scraping ${site}...`)
      
      // Create scraping job record
      const job = await prisma.scrapingJob.create({
        data: {
          county: 'multi',
          source: site,
          status: 'running',
          startedAt: new Date()
        }
      })

      try {
        let scrapedCases = []
        
        switch (site) {
          case 'georgia_probate_records':
            scrapedCases = await scraper.scrapeGeorgiaProbateRecords(
              dateFrom ? new Date(dateFrom) : undefined
            )
            break
          case 'cobb_probate':
            scrapedCases = await scraper.scrapeCobbProbate(
              dateFrom ? new Date(dateFrom) : undefined
            )
            break
          default:
            console.warn(`Unknown site: ${site}`)
            continue
        }

        console.log(`Found ${scrapedCases.length} cases from ${site}`)
        
        // Save cases to database
        let savedCount = 0
        
        for (const scrapedCase of scrapedCases) {
          try {
            // Skip if case already exists
            const existing = await prisma.case.findUnique({
              where: { caseId: scrapedCase.caseId }
            })
            
            if (existing) continue

            // Save case
            const savedCase = await prisma.case.create({
              data: {
                caseId: scrapedCase.caseId,
                county: scrapedCase.county,
                filingDate: scrapedCase.filingDate,
                decedentName: scrapedCase.decedentName,
                decedentAddress: scrapedCase.decedentAddress,
                estateValue: scrapedCase.estateValue,
                caseNumber: scrapedCase.caseNumber,
                attorney: scrapedCase.attorney,
                courtUrl: scrapedCase.courtUrl
              }
            })

            // Save contacts
            if (scrapedCase.petitioner) {
              await prisma.contact.create({
                data: {
                  caseId: (savedCase as any).id,
                  type: 'petitioner',
                  name: scrapedCase.petitioner
                }
              })
            }

            if (scrapedCase.executor) {
              await prisma.contact.create({
                data: {
                  caseId: (savedCase as any).id,
                  type: 'executor', 
                  name: scrapedCase.executor
                }
              })
            }

            if (scrapedCase.administrator) {
              await prisma.contact.create({
                data: {
                  caseId: (savedCase as any).id,
                  type: 'administrator',
                  name: scrapedCase.administrator
                }
              })
            }

            savedCount++
          } catch (caseError) {
            console.error('Error saving case:', caseError)
            continue
          }
        }

        // Update job status
        await prisma.scrapingJob.update({
          where: { id: (job as any).id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            recordsFound: savedCount
          }
        })

        allCases.push({
          site,
          scraped: scrapedCases.length,
          saved: savedCount,
          cases: scrapedCases.map(c => ({
            caseNumber: c.caseNumber,
            decedentName: c.decedentName,
            filingDate: c.filingDate,
            estateValue: c.estateValue,
            county: c.county
          }))
        })

      } catch (siteError) {
        console.error(`Error scraping ${site}:`, siteError)
        
        // Update job with error
        await prisma.scrapingJob.update({
          where: { id: (job as any).id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: siteError instanceof Error ? siteError.message : 'Unknown error'
          }
        })
        
        allCases.push({
          site,
          error: siteError instanceof Error ? siteError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'HTTP scraping completed',
      results: allCases,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('HTTP scraping failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'HTTP scraping failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  // Skip only during build time, not runtime
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.VERCEL_ENV) {
    return NextResponse.json({
      success: false,
      message: 'Not available during build',
      error: 'Service unavailable during build process'
    }, { status: 503 })
  }
  
  return NextResponse.json({
    message: 'Playwright scraper endpoint',
    usage: 'POST with { "sites": ["georgia_probate_records", "cobb_probate"], "dateFrom": "2024-01-01" }',
    features: [
      'Opens each probate site with Playwright',
      'Accepts terms and conditions automatically',
      'Searches by date range (defaults to today)',
      'Opens detail pages for each result', 
      'Extracts decedent, petitioner, executor, case #, filing date',
      'Follows property links to QPublic for parcel details',
      'Saves raw HTML and PDF to storage',
      'Sleeps 15-30 seconds between requests',
      'Stops on CAPTCHA or access denied',
      'Outputs normalized JSON to database'
    ]
  })
}