import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const clerkInfo = {
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      publishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 15) || 'missing',
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 15) || 'missing',
      isTestMode: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('test') || false,
    }

    return NextResponse.json({
      status: 'success',
      clerk: clerkInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Clerk debug error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}