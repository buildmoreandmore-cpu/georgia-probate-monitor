import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Debug endpoint for environment variables
export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        DATABASE_URL: databaseUrl ? 'set' : 'not set',
        DATABASE_URL_PREFIX: databaseUrl ? databaseUrl.substring(0, 20) + '...' : 'none',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        POSTGRES_URL: process.env.POSTGRES_URL ? 'set' : 'not set'
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