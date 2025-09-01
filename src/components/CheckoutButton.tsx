'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getStripe } from '@/lib/stripe'
import { MagnifyingGlassIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface CheckoutButtonProps {
  priceId?: string
  className?: string
  children?: React.ReactNode
}

export function CheckoutButton({ 
  priceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_test_monthly', 
  className = '',
  children
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const { isSignedIn, user } = useUser()

  const handleCheckout = async () => {
    if (!isSignedIn) {
      // Redirect to sign up if not authenticated
      window.location.href = '/sign-up'
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/?canceled=true`,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        alert(error)
        setLoading(false)
        return
      }

      const stripe = await getStripe()
      if (!stripe) {
        alert('Stripe failed to load')
        setLoading(false)
        return
      }

      const { error: stripeError } = await (stripe as any).redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        console.error('Stripe checkout error:', stripeError)
        alert('Failed to redirect to checkout')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-lg transition-colors duration-200 ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          Processing...
        </>
      ) : (
        <>
          {children || (
            <>
              <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
              Start Your $29.99/Month Subscription
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </>
          )}
        </>
      )}
    </button>
  )
}