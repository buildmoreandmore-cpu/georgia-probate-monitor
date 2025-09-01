import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    // Test basic Stripe configuration
    const isConfigured = {
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder'),
      stripePublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('placeholder'),
      monthlyPriceId: !!process.env.STRIPE_MONTHLY_PRICE_ID && !process.env.STRIPE_MONTHLY_PRICE_ID.includes('placeholder'),
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes('placeholder'),
    }

    // Test Stripe API connection
    let stripeConnection = false
    try {
      const balance = await stripe.balance.retrieve()
      stripeConnection = !!balance
    } catch (error) {
      console.error('Stripe connection test failed:', error)
    }

    return NextResponse.json({
      status: 'success',
      configuration: isConfigured,
      stripeConnection,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Stripe test error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}