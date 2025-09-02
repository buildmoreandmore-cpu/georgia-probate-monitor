import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Received Stripe webhook:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckoutCompleted(session)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancelled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Create or update subscription record
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: session.subscription as string,
      status: 'active',
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: session.subscription as string,
      status: 'active',
    },
  })

  console.log(`Subscription created for user: ${userId}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find subscription by customer ID
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!existingSubscription) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  // Update subscription
  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      status: subscription.status,
      currentPeriodStart: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : null,
      currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
    },
  })

  console.log(`Subscription updated: ${subscription.id}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: 'canceled' },
  })

  console.log(`Subscription cancelled: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!subscription) return

  // Record successful payment
  await prisma.payment.create({
    data: {
      userId: subscription.userId,
      stripePaymentId: (invoice as any).payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      description: invoice.description || 'Monthly subscription payment',
    },
  })

  console.log(`Payment succeeded for customer: ${customerId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!subscription) return

  // Record failed payment
  await prisma.payment.create({
    data: {
      userId: subscription.userId,
      stripePaymentId: (invoice as any).payment_intent as string || 'failed',
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: 'Failed subscription payment',
    },
  })

  // Update subscription status
  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: { status: 'past_due' },
  })

  console.log(`Payment failed for customer: ${customerId}`)
}