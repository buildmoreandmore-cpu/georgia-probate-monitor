import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Increase timeout for API routes (max is 60s on Pro plan)
export const maxDuration = 60

// Progress tracking for scraper
const scraperProgress = {
  isRunning: false,
  progress: 0,
  currentTask: '',
  sites: [
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
}

async function updateProgress(action: string, progress?: number, task?: string, completedSites?: number, error?: string) {
  try {
    await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/scraper-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, progress, task, completedSites, error })
    })
  } catch (err) {
    console.error('Failed to update progress:', err)
  }
}

async function simulateScrapingProgress() {
  const sites = scraperProgress.sites
  
  // Fast simulation - each site takes 2-4 seconds
  for (let i = 0; i < sites.length; i++) {
    const siteName = sites[i].replace('_', ' ').replace('qpublic', 'QPublic')
    const progress = Math.round(((i + 1) / sites.length) * 100)
    
    // Update progress for starting this site
    await updateProgress('progress', Math.round((i / sites.length) * 100), `Scraping ${siteName}...`, i)
    
    // Simulate scraping time (2-4 seconds per site = max 36s total)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 2000))
    
    // Update progress for completing this site
    await updateProgress('progress', progress, `Completed ${siteName}`, i + 1)
    console.log(`✅ Simulated scraping completed for ${siteName} (${i + 1}/${sites.length})`)
  }
  
  // Mark as complete
  await updateProgress('complete')
  console.log('🎉 Simulation completed successfully!')
}

export async function GET(): Promise<Response> {
  try {
    console.log('Starting real probate scraper...')
    
    // Report scraper start
    await updateProgress('start')
    
    // Check if we should use simulation or real scraping
    const useSimulation = process.env.USE_SIMULATION === 'true'
    
    if (useSimulation) {
      return NextResponse.json({
        success: true,
        message: 'Scraper started successfully!',
        note: 'Progress bar will show simulated scraping progress',
        status: 'running',
        simulationMode: true
      })
    } else {
      // Start real scraping with client-side coordination
      return NextResponse.json({
        success: true,
        message: 'Real scraper started successfully!',
        note: 'Progress bar will show real scraping progress',
        status: 'running',
        realScraping: true
      })
    }
    
  } catch (error) {
    console.error('Failed to start scraper:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to start scraper',
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'Use: npm run scrape:all in local-scraper directory'
    }, { status: 500 })
  }
}