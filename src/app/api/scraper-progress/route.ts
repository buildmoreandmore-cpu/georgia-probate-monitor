import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Shared progress state
let scraperState = {
  isRunning: false,
  progress: 0,
  currentTask: 'Idle',
  totalSites: 9,
  completedSites: 0,
  startTime: null as Date | null,
  errors: [] as string[]
}

export async function GET() {
  return NextResponse.json(scraperState)
}

export async function POST(request: Request) {
  try {
    const update = await request.json()
    
    // Update scraper state
    if (update.action === 'start') {
      scraperState = {
        ...scraperState,
        isRunning: true,
        progress: 0,
        currentTask: 'Initializing scraper...',
        completedSites: 0,
        startTime: new Date(),
        errors: []
      }
    } else if (update.action === 'progress') {
      scraperState.progress = Math.min(100, update.progress || scraperState.progress)
      scraperState.currentTask = update.task || scraperState.currentTask
      scraperState.completedSites = update.completedSites || scraperState.completedSites
    } else if (update.action === 'complete') {
      scraperState = {
        ...scraperState,
        isRunning: false,
        progress: 100,
        currentTask: 'Scraping completed!',
        completedSites: scraperState.totalSites
      }
    } else if (update.action === 'error') {
      scraperState.errors.push(update.error || 'Unknown error')
      scraperState.currentTask = `Error: ${update.error || 'Unknown error'}`
    }
    
    return NextResponse.json({ success: true, state: scraperState })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }
}

// State is managed internally in this module