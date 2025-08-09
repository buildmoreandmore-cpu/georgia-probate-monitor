import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'
import { CaseOutputSchema } from '@/lib/schemas'

const UpdateCaseSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['active', 'archived']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const caseData = await prisma.case.findUnique({
      where: { id: params.id },
      include: {
        contacts: true,
        parcels: true
      }
    })

    if (!caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: caseData })

  } catch (error) {
    console.error('Error fetching case:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const updateData = UpdateCaseSchema.parse(body)

    const updatedCase = await prisma.case.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contacts: true,
        parcels: true
      }
    })

    return NextResponse.json({ data: updatedCase })

  } catch (error) {
    console.error('Error updating case:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}