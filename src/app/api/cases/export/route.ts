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

    // Transform to output format with new petitioner fields
    const outputCases = cases.map((caseData: any) => ({
      county: caseData.county,
      case_number: caseData.caseNumber || '',
      filing_date: caseData.filingDate.toISOString(),
      petitioner_first_name: caseData.petitionerFirstName || '',
      petitioner_last_name: caseData.petitionerLastName || '',
      petitioner_address: caseData.petitionerAddress || '',
      petitioner_city: caseData.petitionerCity || '',
      petitioner_state: caseData.petitionerState || '',
      petitioner_zipcode: caseData.petitionerZipcode || '',
      petitioner_phone: caseData.petitionerPhone || '',
      petitioner_email: caseData.petitionerEmail || '',
      decedent_name: caseData.decedentName,
      decedent_address: caseData.decedentAddress || '',
      decedent_city: caseData.decedentCity || '',
      decedent_state: caseData.decedentState || '',
      decedent_zipcode: caseData.decedentZipcode || '',
      estate_value: caseData.estateValue,
      contacts: caseData.contacts.map((contact: any) => ({
        type: contact.type as 'executor' | 'administrator' | 'petitioner',
        name: contact.name,
        original_address: contact.originalAddress || '',
        standardized_address: contact.standardizedAddress || '',
        ups_deliverable: contact.upsDeliverable,
        phone: contact.phone,
        phone_source: contact.phoneSource as 'csv' | 'provider' | null
      })),
      parcels: caseData.parcels.map((parcel: any) => ({
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

function generateCSV(cases: any[]): string {
  const headers = [
    'county',
    'case_number',
    'filing_date',
    'petitioner_first_name',
    'petitioner_last_name',
    'petitioner_address',
    'petitioner_city',
    'petitioner_state',
    'petitioner_zipcode',
    'petitioner_phone',
    'petitioner_email',
    'decedent_name',
    'decedent_address',
    'decedent_city',
    'decedent_state',
    'decedent_zipcode',
    'estate_value'
  ]

  const rows: string[][] = [headers]

  for (const caseData of cases) {
    const row = [
      caseData.county || '',
      caseData.case_number || '',
      caseData.filing_date || '',
      caseData.petitioner_first_name || '',
      caseData.petitioner_last_name || '',
      caseData.petitioner_address || '',
      caseData.petitioner_city || '',
      caseData.petitioner_state || '',
      caseData.petitioner_zipcode || '',
      caseData.petitioner_phone || '',
      caseData.petitioner_email || '',
      caseData.decedent_name || '',
      caseData.decedent_address || '',
      caseData.decedent_city || '',
      caseData.decedent_state || '',
      caseData.decedent_zipcode || '',
      caseData.estate_value?.toString() || ''
    ]

    rows.push(row)
  }

  return rows.map(row => 
    row.map(field => `"${field.toString().replace(/"/g, '""')}"`)
       .join(',')
  ).join('\n')
}