import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const ContactSchema = z.object({
  type: z.enum(['executor', 'administrator', 'petitioner']),
  name: z.string(),
  address: z.string().optional()
})

const PropertySchema = z.object({
  parcelId: z.string(),
  situsAddress: z.string().optional(),
  taxMailingAddress: z.string().optional(), 
  currentOwner: z.string().optional(),
  qpublicUrl: z.string().optional()
})

const BulkCaseSchema = z.object({
  caseId: z.string(),
  county: z.string(),
  filingDate: z.string(), // ISO string
  decedentName: z.string(),
  caseNumber: z.string().optional(),
  attorney: z.string().optional(),
  courtUrl: z.string().optional(),
  contacts: z.array(ContactSchema).optional(),
  properties: z.array(PropertySchema).optional()
})

const BulkUploadSchema = z.object({
  cases: z.array(BulkCaseSchema).min(1).max(50) // Limit bulk uploads
})

export async function POST(request: NextRequest) {
  try {
    // Simple API key check (optional)
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.API_KEY || 'local-scraper'
    
    if (authHeader && !authHeader.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await request.json()
    const { cases } = BulkUploadSchema.parse(body)
    
    console.log(`📥 Received bulk upload of ${cases.length} cases`)
    
    const results = {
      total: cases.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const caseData of cases) {
      try {
        // Check if case already exists
        const existing = await prisma.case.findUnique({
          where: { caseId: caseData.caseId }
        })

        if (existing) {
          console.log(`⏭️  Skipping existing case: ${caseData.caseNumber}`)
          results.skipped++
          continue
        }

        // Create case
        const savedCase = await prisma.case.create({
          data: {
            caseId: caseData.caseId,
            county: caseData.county,
            filingDate: new Date(caseData.filingDate),
            decedentName: caseData.decedentName,
            caseNumber: caseData.caseNumber,
            attorney: caseData.attorney,
            courtUrl: caseData.courtUrl
          }
        })

        console.log(`✅ Created case: ${savedCase.caseNumber} - ${savedCase.decedentName}`)

        // Create contacts
        if (caseData.contacts) {
          for (const contact of caseData.contacts) {
            await prisma.contact.create({
              data: {
                caseId: savedCase.id,
                type: contact.type,
                name: contact.name,
                originalAddress: contact.address
              }
            })
          }
          console.log(`👥 Added ${caseData.contacts.length} contacts`)
        }

        // Create properties/parcels
        if (caseData.properties) {
          for (const property of caseData.properties) {
            await prisma.parcel.create({
              data: {
                caseId: savedCase.id,
                parcelId: property.parcelId,
                county: caseData.county,
                situsAddress: property.situsAddress,
                taxMailingAddress: property.taxMailingAddress,
                currentOwner: property.currentOwner,
                qpublicUrl: property.qpublicUrl,
                matchConfidence: 1.0 // High confidence for direct scraping
              }
            })
          }
          console.log(`🏠 Added ${caseData.properties.length} properties`)
        }

        results.created++

      } catch (caseError) {
        console.error(`❌ Error processing case ${caseData.caseId}:`, caseError)
        results.errors.push(`${caseData.caseId}: ${caseError instanceof Error ? caseError.message : 'Unknown error'}`)
        continue
      }
    }

    // Create a bulk scraping job record
    try {
      await prisma.scrapingJob.create({
        data: {
          county: 'bulk',
          source: 'local_playwright',
          status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          recordsFound: results.created,
          errorMessage: results.errors.length > 0 ? `${results.errors.length} errors occurred` : undefined
        }
      })
    } catch (jobError) {
      console.warn('Failed to create scraping job record:', jobError)
    }

    console.log(`📊 Bulk upload complete:`, results)

    return NextResponse.json({
      success: true,
      message: 'Bulk case upload completed',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Bulk upload failed:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid data format',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Bulk case upload endpoint',
    usage: 'POST with JSON array of cases',
    schema: {
      cases: [{
        caseId: 'string',
        county: 'string', 
        filingDate: 'ISO date string',
        decedentName: 'string',
        caseNumber: 'string (optional)',
        attorney: 'string (optional)',
        courtUrl: 'string (optional)',
        contacts: [{
          type: 'executor|administrator|petitioner',
          name: 'string',
          address: 'string (optional)'
        }],
        properties: [{
          parcelId: 'string',
          situsAddress: 'string (optional)',
          taxMailingAddress: 'string (optional)',
          currentOwner: 'string (optional)',
          qpublicUrl: 'string (optional)'
        }]
      }]
    },
    authentication: 'Bearer token in Authorization header (optional)',
    limits: 'Max 50 cases per request'
  })
}