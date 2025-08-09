import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'
import { SimpleScraper } from '@/services/scrapers/simple-scraper'

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
          // Use simple reliable scraper that always works
          const scraper = new SimpleScraper()
          const scrapedCases = await scraper.scrape(dateFrom, dateTo)
          
          console.log(`Scraper returned ${scrapedCases.length} cases for ${county}/${source}`)
          
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
                  attorneyPhone: scrapedCase.attorneyPhone,
                  courtUrl: scrapedCase.courtUrl
                }
              })

              // Save contacts
              for (const contact of scrapedCase.contacts || []) {
                await prisma.contact.create({
                  data: {
                    caseId: savedCase.id,
                    type: contact.type,
                    name: contact.name,
                    originalAddress: contact.address
                  }
                })
              }

              savedCount++
            } catch (caseError) {
              console.error('Error processing individual case:', caseError)
              continue
            }
          }

          // No cleanup needed for simple scraper

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