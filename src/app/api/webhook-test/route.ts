import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const webhookInfo = {
      webhookEndpoint: '/api/webhooks/stripe',
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes('placeholder'),
      productionUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/webhooks/stripe` : 'Not available',
      instructions: {
        step1: 'Copy the webhook URL above',
        step2: 'Go to Stripe Dashboard > Developers > Webhooks',
        step3: 'Add endpoint with the copied URL',
        step4: 'Select events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed',
        step5: 'Copy the webhook signing secret and update STRIPE_WEBHOOK_SECRET environment variable',
      }
    }

    return NextResponse.json({
      status: 'success',
      webhook: webhookInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}