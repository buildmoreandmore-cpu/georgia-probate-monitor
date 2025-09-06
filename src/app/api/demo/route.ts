import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Demo data creation is disabled - only real scraped data allowed
    return NextResponse.json(
      { 
        error: 'Demo data creation is disabled',
        message: 'This application only uses real scraped probate data'
      },
      { status: 403 }
    )

  } catch (error) {
    console.error('Error creating demo data:', error)
    return NextResponse.json(
      { error: 'Failed to create demo data' },
      { status: 500 }
    )
  }
}