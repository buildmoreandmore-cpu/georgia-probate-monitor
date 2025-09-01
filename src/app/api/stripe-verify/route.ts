import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    const keyAnalysis = {
      secretKeyFormat: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'missing',
      publishableKeyFormat: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7) || 'missing',
      priceIdFormat: process.env.STRIPE_MONTHLY_PRICE_ID?.substring(0, 6) || 'missing',
      webhookSecretFormat: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 6) || 'missing',
    }

    // Test actual Stripe API connection
    const stripeApiTest = {
      connected: false,
      keyType: 'unknown' as string,
      error: null as string | null
    }

    try {
      // Try to retrieve account info to verify the key works
      const account = await stripe.accounts.retrieve()
      Object.assign(stripeApiTest, {
        connected: true,
        keyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'LIVE' : 
                process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN'
      })
      
      return NextResponse.json({
        status: 'success',
        keyAnalysis,
        stripeApiTest,
        isPlaceholder: keyAnalysis.secretKeyFormat.includes('placeholder') || 
                      keyAnalysis.publishableKeyFormat.includes('placeholder') ||
                      keyAnalysis.priceIdFormat.includes('placeholder') ||
                      keyAnalysis.webhookSecretFormat.includes('placeholder'),
        accountId: account.id,
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      Object.assign(stripeApiTest, { error: error.message })
      
      return NextResponse.json({
        status: 'partial',
        keyAnalysis,
        stripeApiTest,
        isPlaceholder: keyAnalysis.secretKeyFormat.includes('placeholder') || 
                      keyAnalysis.publishableKeyFormat.includes('placeholder') ||
                      keyAnalysis.priceIdFormat.includes('placeholder') ||
                      keyAnalysis.webhookSecretFormat.includes('placeholder'),
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Stripe verification error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}