'use client'

import { useState } from 'react'
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface SafeCheckoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function SafeCheckoutButton({ 
  className = '',
  children
}: SafeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    
    // Simple redirect to sign-up for now to avoid complex Stripe/Clerk interactions
    try {
      window.location.href = '/sign-up'
    } catch (error) {
      console.error('Navigation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultContent = (
    <>
      <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
      Subscribe for $29.99/Month
      <ChevronRightIcon className="w-5 h-5 ml-2" />
    </>
  )

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${className}`}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Processing...
        </div>
      ) : (
        children || defaultContent
      )}
    </button>
  )
}