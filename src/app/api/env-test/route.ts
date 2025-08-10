import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const database = process.env.DATABASE
    const direct = process.env.DIRECT
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        DATABASE: database ? 'set' : 'not set',
        DATABASE_PREFIX: database ? database.substring(0, 30) + '...' : 'none',
        DIRECT: direct ? 'set' : 'not set',
        DIRECT_PREFIX: direct ? direct.substring(0, 30) + '...' : 'none',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL ? 'true' : 'false',
        VERCEL_ENV: process.env.VERCEL_ENV || 'not set'
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}