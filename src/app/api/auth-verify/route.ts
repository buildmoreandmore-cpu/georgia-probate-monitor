import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const authInfo = {
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      publishableKeyType: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ? 'PRODUCTION' : 
                         process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') ? 'DEVELOPMENT' : 'UNKNOWN',
      secretKeyType: process.env.CLERK_SECRET_KEY?.startsWith('sk_live_') ? 'PRODUCTION' : 
                    process.env.CLERK_SECRET_KEY?.startsWith('sk_test_') ? 'DEVELOPMENT' : 'UNKNOWN',
      isProductionMode: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') && 
                       process.env.CLERK_SECRET_KEY?.startsWith('sk_live_'),
    }

    return NextResponse.json({
      status: 'success',
      auth: authInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}