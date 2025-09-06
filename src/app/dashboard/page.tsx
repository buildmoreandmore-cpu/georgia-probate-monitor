'use client'

import { useUser } from '@clerk/nextjs'
import { StatsCard } from '@/components/StatsCard'
import ScraperProgressBar from '@/components/ScraperProgressBar'
import { useState } from 'react'

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useUser()
  const [showProgress, setShowProgress] = useState(false)
  const [isScraperRunning, setIsScraperRunning] = useState(false)

  const simulateProgressClientSide = async () => {
    const sites = [
      'georgia probate records',
      'cobb probate', 
      'qpublic cobb',
      'qpublic dekalb',
      'qpublic fulton',
      'qpublic fayette',
      'qpublic newton',
      'qpublic douglas',
      'qpublic gwinnett'
    ]
    
    // Simulate each site taking 3-5 seconds
    for (let i = 0; i < sites.length; i++) {
      const progress = Math.round(((i + 1) / sites.length) * 100)
      
      // Update progress
      await fetch('/api/scraper-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'progress', 
          progress, 
          task: `Scraping ${sites[i]}...`, 
          completedSites: i + 1 
        })
      })
      
      // Wait 3-5 seconds before next site
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000))
    }
    
    // Mark as complete
    await fetch('/api/scraper-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' })
    })
  }

  const runRealScraper = async () => {
    const siteIds = [
      'georgia_probate_records',
      'cobb_probate', 
      'qpublic_cobb',
      'qpublic_dekalb',
      'qpublic_fulton',
      'qpublic_fayette',
      'qpublic_newton',
      'qpublic_douglas',
      'qpublic_gwinnett'
    ]
    
    const siteNames = [
      'Georgia Probate Records',
      'Cobb Probate Court', 
      'QPublic Cobb County',
      'QPublic DeKalb County',
      'QPublic Fulton County',
      'QPublic Fayette County',
      'QPublic Newton County',
      'QPublic Douglas County',
      'QPublic Gwinnett County'
    ]
    
    let totalCases = 0
    
    // Scrape each site individually
    for (let i = 0; i < siteIds.length; i++) {
      const progress = Math.round((i / siteIds.length) * 100)
      
      // Update progress for starting this site
      await fetch('/api/scraper-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'progress', 
          progress, 
          task: `Scraping ${siteNames[i]}...`, 
          completedSites: i 
        })
      })
      
      try {
        // Call the individual site scraper
        const response = await fetch('/api/scrape-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site: siteIds[i] })
        })
        
        const result = await response.json()
        
        if (result.success) {
          totalCases += result.casesFound || 0
          console.log(`✅ ${siteNames[i]}: Found ${result.casesFound} cases`)
          
          // Save cases to database if any were found
          if (result.cases && result.cases.length > 0) {
            try {
              const saveResponse = await fetch('/api/save-cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cases: result.cases })
              })
              
              const saveResult = await saveResponse.json()
              
              if (saveResult.success) {
                console.log(`💾 ${siteNames[i]}: Saved ${saveResult.savedCount} cases to database`)
              } else {
                console.error(`💾 ${siteNames[i]}: Failed to save cases: ${saveResult.error}`)
              }
            } catch (saveError) {
              console.error(`💾 ${siteNames[i]}: Database save error`, saveError)
            }
          }
        } else {
          console.error(`❌ ${siteNames[i]}: ${result.error}`)
        }
      } catch (error) {
        console.error(`❌ ${siteNames[i]}: Network error`, error)
      }
      
      // Update progress for completing this site
      const finalProgress = Math.round(((i + 1) / siteIds.length) * 100)
      await fetch('/api/scraper-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'progress', 
          progress: finalProgress, 
          task: `Completed ${siteNames[i]} (${totalCases} total cases)`, 
          completedSites: i + 1 
        })
      })
    }
    
    // Mark as complete
    await fetch('/api/scraper-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' })
    })
    
    console.log(`🎉 Real scraping completed! Total cases found: ${totalCases}`)
  }

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
          onClick={async () => {
            setShowProgress(true)
            setIsScraperRunning(true)
            
            try {
              const response = await fetch('/api/scrape-playwright', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sites: ['georgia_probate_records'],
                  dateFrom: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // Past 3 days
                })
              })
              const result = await response.json()
              
              if (result.success) {
                console.log('Scraper completed successfully:', result.message)
                console.log('Cases saved:', result.saved)
                
                // Show success message and refresh data
                setProgress(100)
                setCurrentStep('Scraping completed successfully!')
                
                // Refresh the page after a delay to show updated data
                setTimeout(() => {
                  window.location.reload()
                }, 2000)
              } else {
                console.error('Scraper failed:', result.error)
                setShowProgress(false)
                setIsScraperRunning(false)
              }
            } catch (error) {
              console.error('Failed to start scraper:', error)
              setShowProgress(false)
              setIsScraperRunning(false)
            }
          }}
          disabled={isScraperRunning}
          className={`px-4 py-2 ${isScraperRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md`}
        >
          {isScraperRunning ? 'Scraping...' : 'Run Scraper'}
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

      {/* Progress Bar Modal */}
      <ScraperProgressBar 
        isVisible={showProgress}
        onComplete={() => {
          setShowProgress(false)
          setIsScraperRunning(false)
          // Optionally refresh the page to show new cases
          setTimeout(() => {
            window.location.href = '/cases'
          }, 1000)
        }}
      />
    </div>
  )
}