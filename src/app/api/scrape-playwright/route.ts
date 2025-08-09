import { NextRequest, NextResponse } from 'next/server'
import { PlaywrightScraper } from '@/services/scrapers/playwright-scraper'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const scraper = new PlaywrightScraper()
  
  try {
    const body = await request.json()
    const { sites = ['georgia_probate_records'], dateFrom } = body
    
    console.log('Starting Playwright scraping for sites:', sites)
    
    await scraper.initialize()
    
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
            scrapedCases = await scraper.scrapeCobb()
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
                caseNumber: scrapedCase.caseNumber,
                attorney: scrapedCase.executor || scrapedCase.administrator,
                courtUrl: scrapedCase.courtUrl
              }
            })

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
            for (const property of scrapedCase.properties) {
              await prisma.parcel.create({
                data: {
                  caseId: savedCase.id,
                  parcelId: property.parcelId,
                  county: scrapedCase.county,
                  situsAddress: property.situsAddress,
                  taxMailingAddress: property.taxMailingAddress,
                  currentOwner: property.currentOwner,
                  qpublicUrl: property.qpublicUrl,
                  matchConfidence: 1.0 // High confidence for direct scraping
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
          where: { id: job.id },
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
            propertiesCount: c.properties.length,
            rawHtmlPath: c.rawHtmlPath,
            rawPdfPath: c.rawPdfPath
          }))
        })

      } catch (siteError) {
        console.error(`Error scraping ${site}:`, siteError)
        
        // Update job with error
        await prisma.scrapingJob.update({
          where: { id: job.id },
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
      message: 'Playwright scraping completed',
      results: allCases,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Playwright scraping failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Playwright scraping failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
    
  } finally {
    await scraper.cleanup()
  }
}

export async function GET() {
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