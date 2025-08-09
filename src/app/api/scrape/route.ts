import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'
import { GeorgiaProbateRecordsScraper } from '@/services/scrapers/georgia-probate-records'
import { CobbProbateScraper } from '@/services/scrapers/cobb-probate'
import { createVercelScraper } from '@/services/scrapers/vercel-compatible-scraper'
import { DataMatcher } from '@/services/matching/data-matcher'

const ScrapeJobSchema = z.object({
  counties: z.array(z.string()).min(1),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sources: z.array(z.enum(['georgia_probate_records', 'cobb_probate'])).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const params = ScrapeJobSchema.parse(body)

    const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined
    const dateTo = params.dateTo ? new Date(params.dateTo) : undefined
    const sources = params.sources || ['georgia_probate_records', 'cobb_probate']

    const results = []

    for (const county of params.counties) {
      for (const source of sources) {
        // Create scraping job record
        const job = await prisma.scrapingJob.create({
          data: {
            county,
            source,
            status: 'running',
            startedAt: new Date()
          }
        })

        try {
          let scraper: any
          let scrapedCases: any[] = []

          // Initialize appropriate scraper
          const vercelScraper = createVercelScraper()
          if (vercelScraper) {
            // Use Vercel-compatible scraper in serverless environment
            scraper = vercelScraper
            scrapedCases = await scraper.scrape(dateFrom, dateTo)
          } else {
            // Use full Playwright scrapers in development/Docker
            switch (source) {
              case 'georgia_probate_records':
                scraper = new GeorgiaProbateRecordsScraper()
                scrapedCases = await scraper.scrape(dateFrom, dateTo)
                break
              case 'cobb_probate':
                if (county === 'cobb') {
                  scraper = new CobbProbateScraper()
                  scrapedCases = await scraper.scrape(dateFrom, dateTo)
                }
                break
            }
          }

          // Process and save cases
          const matcher = new DataMatcher()
          let savedCount = 0

          for (const scrapedCase of scrapedCases) {
            try {
              // Skip if case already exists
              const existing = await prisma.case.findUnique({
                where: { caseId: scrapedCase.caseId }
              })

              if (existing) continue

              // Match properties and enrich contacts
              const matchResult = await matcher.processCase(scrapedCase)

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
                  attorneyPhone: scrapedCase.attorneyPhone,
                  courtUrl: scrapedCase.courtUrl
                }
              })

              // Save contacts
              for (const contact of matchResult.enrichedContacts) {
                await prisma.contact.create({
                  data: {
                    caseId: savedCase.id,
                    type: contact.type,
                    name: contact.name,
                    originalAddress: contact.address,
                    standardizedAddress: contact.standardizedAddress,
                    upsDeliverable: contact.upsDeliverable || false,
                    phone: contact.phone,
                    phoneSource: contact.phoneSource,
                    phoneConfidence: contact.phoneConfidence
                  }
                })
              }

              // Save parcels
              for (const property of matchResult.properties) {
                await prisma.parcel.create({
                  data: {
                    caseId: savedCase.id,
                    parcelId: property.parcelId,
                    county: property.county,
                    situsAddress: property.situsAddress,
                    taxMailingAddress: property.taxMailingAddress,
                    currentOwner: property.currentOwner,
                    lastSaleDate: property.lastSaleDate,
                    assessedValue: property.assessedValue,
                    legalDescription: property.legalDescription,
                    qpublicUrl: property.qpublicUrl,
                    matchConfidence: property.matchConfidence
                  }
                })
              }

              savedCount++
            } catch (caseError) {
              console.error('Error processing individual case:', caseError)
              continue
            }
          }

          await matcher.cleanup()
          if (scraper?.cleanup) {
            await scraper.cleanup()
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

          results.push({
            county,
            source,
            status: 'completed',
            recordsFound: savedCount
          })

        } catch (error) {
          console.error(`Error scraping ${source} for ${county}:`, error)

          // Update job with error
          await prisma.scrapingJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              completedAt: new Date(),
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          })

          results.push({
            county,
            source,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Scraping jobs completed',
      results
    })

  } catch (error) {
    console.error('Error starting scrape jobs:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Get recent scraping jobs
    const jobs = await prisma.scrapingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ data: jobs })

  } catch (error) {
    console.error('Error fetching scraping jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}