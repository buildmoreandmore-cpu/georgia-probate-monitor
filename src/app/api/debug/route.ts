import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const envCheck = {
      hasClerkPublishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      hasStripePublishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }

    return NextResponse.json({
      status: 'success',
      environment: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}