import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'
import { CaseOutput } from '@/lib/schemas'

const ExportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  caseIds: z.array(z.string()).optional(),
  county: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
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
    const params = ExportSchema.parse(body)

    // Build where clause
    const where: any = {}
    if (params.caseIds && params.caseIds.length > 0) {
      where.id = { in: params.caseIds }
    }
    if (params.county) where.county = params.county
    if (params.dateFrom || params.dateTo) {
      where.filingDate = {}
      if (params.dateFrom) where.filingDate.gte = new Date(params.dateFrom)
      if (params.dateTo) where.filingDate.lte = new Date(params.dateTo)
    }

    // Fetch cases
    const cases = await prisma.case.findMany({
      where,
      include: {
        contacts: true,
        parcels: true
      },
      orderBy: { filingDate: 'desc' }
    })

    // Transform to output format
    const outputCases: CaseOutput[] = cases.map(caseData => ({
      case_id: caseData.caseId,
      county: caseData.county,
      filing_date: caseData.filingDate.toISOString(),
      decedent: {
        name: caseData.decedentName,
        address: caseData.decedentAddress || ''
      },
      estate_value: caseData.estateValue,
      contacts: caseData.contacts.map(contact => ({
        type: contact.type as 'executor' | 'administrator' | 'petitioner',
        name: contact.name,
        original_address: contact.originalAddress || '',
        standardized_address: contact.standardizedAddress || '',
        ups_deliverable: contact.upsDeliverable,
        phone: contact.phone,
        phone_source: contact.phoneSource as 'csv' | 'provider' | null
      })),
      parcels: caseData.parcels.map(parcel => ({
        parcel_id: parcel.parcelId,
        county: parcel.county,
        situs_address: parcel.situsAddress || '',
        tax_mailing_address: parcel.taxMailingAddress || '',
        current_owner: parcel.currentOwner || '',
        last_sale_date: parcel.lastSaleDate?.toISOString() || null,
        assessed_value: parcel.assessedValue,
        qpublic_url: parcel.qpublicUrl || ''
      }))
    }))

    if (params.format === 'csv') {
      // Generate CSV
      const csvData = generateCSV(outputCases)
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="probate-cases-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Return JSON
    return NextResponse.json({
      data: outputCases,
      count: outputCases.length,
      exportedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error exporting cases:', error)
    
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

function generateCSV(cases: CaseOutput[]): string {
  const headers = [
    'case_id',
    'county',
    'filing_date',
    'decedent_name',
    'decedent_address',
    'estate_value',
    'contact_type',
    'contact_name',
    'contact_original_address',
    'contact_standardized_address',
    'contact_ups_deliverable',
    'contact_phone',
    'contact_phone_source',
    'parcel_id',
    'parcel_county',
    'parcel_situs_address',
    'parcel_tax_mailing_address',
    'parcel_current_owner',
    'parcel_last_sale_date',
    'parcel_assessed_value',
    'qpublic_url'
  ]

  const rows: string[][] = [headers]

  for (const caseData of cases) {
    // Handle cases with no contacts or parcels
    const maxRows = Math.max(caseData.contacts.length, caseData.parcels.length, 1)

    for (let i = 0; i < maxRows; i++) {
      const contact = caseData.contacts[i]
      const parcel = caseData.parcels[i]

      const row = [
        caseData.case_id,
        caseData.county,
        caseData.filing_date,
        caseData.decedent.name,
        caseData.decedent.address,
        caseData.estate_value?.toString() || '',
        contact?.type || '',
        contact?.name || '',
        contact?.original_address || '',
        contact?.standardized_address || '',
        contact?.ups_deliverable?.toString() || '',
        contact?.phone || '',
        contact?.phone_source || '',
        parcel?.parcel_id || '',
        parcel?.county || '',
        parcel?.situs_address || '',
        parcel?.tax_mailing_address || '',
        parcel?.current_owner || '',
        parcel?.last_sale_date || '',
        parcel?.assessed_value?.toString() || '',
        parcel?.qpublic_url || ''
      ]

      rows.push(row)
    }
  }

  return rows.map(row => 
    row.map(field => `"${field.replace(/"/g, '""')}"`)
       .join(',')
  ).join('\n')
}