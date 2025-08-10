import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Debug endpoint for environment variables
export async function GET(_request: NextRequest) {
  try {
    const _databaseUrl = process.env.DATABASE_URL
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
        DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 25) + '...' : 'none',
        DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'not set',
        DIRECT_URL_PREFIX: process.env.DIRECT_URL ? process.env.DIRECT_URL.substring(0, 25) + '...' : 'none',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV
      }
    })

  } catch (error) {
    console.error('Debug endpoint failed:', error)
    
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        vercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
}