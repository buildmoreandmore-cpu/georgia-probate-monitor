'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface Subscription {
  id: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export function SubscriptionStatus() {
  const { user } = useUser()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus()
    }
  }, [user])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return
    
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.'
    )
    
    if (!confirmed) return

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })
      
      if (response.ok) {
        await fetchSubscriptionStatus()
        alert('Subscription cancelled successfully')
      } else {
        alert('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      alert('Failed to cancel subscription')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!subscription || subscription.status === 'inactive') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <XCircleIcon className="w-6 h-6 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">No Active Subscription</h3>
        </div>
        <p className="text-gray-600 mb-4">
          You need an active subscription to access probate records.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Subscribe Now
        </button>
      </div>
    )
  }

  const getStatusIcon = () => {
    switch (subscription.status) {
      case 'active':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />
      case 'past_due':
        return <ClockIcon className="w-6 h-6 text-yellow-600" />
      case 'canceled':
        return <XCircleIcon className="w-6 h-6 text-red-600" />
      default:
        return <ClockIcon className="w-6 h-6 text-gray-600" />
    }
  }

  const getStatusText = () => {
    switch (subscription.status) {
      case 'active':
        return 'Active'
      case 'past_due':
        return 'Past Due'
      case 'canceled':
        return 'Cancelled'
      default:
        return subscription.status
    }
  }

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'active':
        return 'text-green-600'
      case 'past_due':
        return 'text-yellow-600'
      case 'canceled':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-gray-900 ml-2">
            Subscription Status
          </h3>
        </div>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div>
          <span className="font-medium">Plan:</span> Professional Access ($29.99/month)
        </div>
        
        {subscription.currentPeriodEnd && (
          <div>
            <span className="font-medium">
              {subscription.cancelAtPeriodEnd ? 'Expires:' : 'Next billing:'}
            </span>{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>

      {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={handleCancelSubscription}
            className="text-red-600 text-sm hover:text-red-800"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {subscription.cancelAtPeriodEnd && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            Your subscription is set to cancel at the end of the current billing period.
            You will retain access until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'then'}.
          </p>
        </div>
      )}
    </div>
  )
}