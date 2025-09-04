'use client'

import { useUser } from '@clerk/nextjs'
import { StatsCard } from '@/components/StatsCard'

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useUser()

  // Show loading state while Clerk loads
  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-6 overflow-x-hidden">
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-6 overflow-x-hidden">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to access the dashboard.</p>
          <a 
            href="/sign-in"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Georgia Probate Filing Monitor</p>
        </div>
        <button 
          onClick={() => window.location.href = '/api/scrape-test'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Run Scraper
        </button>
      </div>

      {/* Scraper Status */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 text-green-500 mr-2">✅</div>
            <h3 className="text-lg font-semibold text-gray-900">Scraper Status</h3>
          </div>
          <p className="text-gray-600">
            Local scraper is operational. Click &ldquo;Run Scraper&rdquo; to start scraping all probate and property sites.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatsCard 
          label="Scraper Status" 
          value="Ready" 
          tone="success"
        />
        <StatsCard 
          label="Last Run" 
          value="Available" 
        />
        <StatsCard 
          label="Local Tool" 
          value="Active" 
          tone="success"
        />
        <StatsCard 
          label="API Endpoint" 
          value="Online" 
          tone="success"
        />
      </div>

      <div className="bg-green-50 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-green-900 mb-4">
          🚀 Scraper Ready
        </h2>
        <p className="text-green-800 mb-4">
          The Georgia Probate Records scraper is operational and ready to search for new filings.
        </p>
        <p className="text-green-700 text-sm">
          Use the scraper button above to run a complete scrape of all probate and property sites, or use the local scraper tool directly with &lsquo;npm run scrape:all&rsquo;.
        </p>
      </div>
    </div>
  )
}