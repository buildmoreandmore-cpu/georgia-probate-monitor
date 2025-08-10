import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return NextResponse.json({
        status: 'build-time',
        timestamp: new Date().toISOString(),
        database: 'skipped-during-build',
        environment: process.env.NODE_ENV,
        deployment: process.env.VERCEL ? 'vercel' : 'local'
      })
    }

    // Test database connection
    const caseCount = await prisma.case.count()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      cases: caseCount,
      environment: process.env.NODE_ENV,
      deployment: process.env.VERCEL ? 'vercel' : 'local'
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}