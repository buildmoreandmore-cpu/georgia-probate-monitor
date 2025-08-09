import { NextRequest, NextResponse } from 'next/server'
import { prisma, initializeDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Initialize database tables on first access
    await initializeDatabase()
    
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