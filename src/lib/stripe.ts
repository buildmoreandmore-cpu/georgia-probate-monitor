import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})

export const getStripe = async () => {
  const { loadStripe } = await import('@stripe/stripe-js')
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing')
    return null
  }
  
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}

// Pricing configuration
export const PRICING = {
  MONTHLY: {
    amount: 2999, // $29.99 in cents
    currency: 'usd',
    interval: 'month' as const,
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
  },
}