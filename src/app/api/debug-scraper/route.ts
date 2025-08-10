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
        DATABASE: process.env.DATABASE ? 'set' : 'not set',
        DATABASE_PREFIX: process.env.DATABASE ? process.env.DATABASE.substring(0, 25) + '...' : 'none',
        DIRECT: process.env.DIRECT ? 'set' : 'not set',
        DIRECT_PREFIX: process.env.DIRECT ? process.env.DIRECT.substring(0, 25) + '...' : 'none',
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