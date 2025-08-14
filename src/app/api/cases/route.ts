import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'
// Removed unused CaseOutputSchema import

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GetCasesSchema = z.object({
  county: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  estateValueMin: z.coerce.number().min(0).optional(),
  estateValueMax: z.coerce.number().min(0).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return NextResponse.json({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = GetCasesSchema.parse({
      county: searchParams.get('county'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      estateValueMin: searchParams.get('estateValueMin'),
      estateValueMax: searchParams.get('estateValueMax'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    // Build where clause
    const where: any = {}
    if (params.county) where.county = params.county
    if (params.status) where.status = params.status
    if (params.dateFrom || params.dateTo) {
      where.filingDate = {}
      if (params.dateFrom) where.filingDate.gte = new Date(params.dateFrom)
      if (params.dateTo) where.filingDate.lte = new Date(params.dateTo)
    }
    if (params.estateValueMin !== undefined || params.estateValueMax !== undefined) {
      where.estateValue = {}
      if (params.estateValueMin !== undefined) where.estateValue.gte = params.estateValueMin
      if (params.estateValueMax !== undefined) where.estateValue.lte = params.estateValueMax
    }

    // Get total count
    const total = await prisma.case.count({ where })

    // Get cases with relations
    const cases = await prisma.case.findMany({
      where,
      include: {
        contacts: true,
        parcels: true
      },
      orderBy: { filingDate: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    })

    return NextResponse.json({
      data: cases,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      }
    })

  } catch (error) {
    console.error('Error fetching cases:', error)
    
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