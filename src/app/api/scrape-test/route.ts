import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

export async function GET(): Promise<Response> {
  try {
    console.log('Starting probate scraper...')
    
    // Report scraper start
    await updateProgress('start')
    
    // Run the scraper command from the local-scraper directory
    const scraperPath = join(process.cwd(), 'local-scraper')
    
    return new Promise<Response>((resolve) => {
      const scraperProcess = spawn('npm', ['run', 'scrape:all'], {
        cwd: scraperPath,
        stdio: 'pipe'
      })
      
      let output = ''
      let errors = ''
      let completedSites = 0
      
      scraperProcess.stdout?.on('data', async (data) => {
        const text = data.toString()
        output += text
        console.log('Scraper output:', text)
        
        // Parse progress from scraper output
        if (text.includes('Starting scrape for')) {
          const progress = Math.round((completedSites / scraperProgress.sites.length) * 100)
          await updateProgress('progress', progress, `Scraping ${text.match(/Starting scrape for (\w+)/)?.[1] || 'site'}...`, completedSites)
        } else if (text.includes('completed successfully') || text.includes('No cases found')) {
          completedSites++
          const progress = Math.round((completedSites / scraperProgress.sites.length) * 100)
          await updateProgress('progress', progress, `Completed ${completedSites}/${scraperProgress.sites.length} sites`, completedSites)
        }
      })
      
      scraperProcess.stderr?.on('data', async (data) => {
        const text = data.toString()
        errors += text
        console.error('Scraper error:', text)
        await updateProgress('error', undefined, undefined, undefined, text.slice(0, 100))
      })
      
      scraperProcess.on('close', async (code) => {
        if (code === 0) {
          await updateProgress('complete')
          resolve(NextResponse.json({
            success: true,
            message: 'Scraper completed successfully!',
            note: 'Check the cases page to see newly scraped data',
            output: output.slice(-500), // Last 500 characters
            casesUrl: '/cases',
            completedSites
          }))
        } else {
          await updateProgress('error', undefined, undefined, undefined, errors || `Process exited with code ${code}`)
          resolve(NextResponse.json({
            success: false,
            message: 'Scraper failed',
            error: errors || 'Process exited with code ' + code,
            output: output.slice(-500)
          }, { status: 500 }))
        }
      })
      
      // Timeout after 5 minutes
      setTimeout(async () => {
        scraperProcess.kill()
        await updateProgress('error', undefined, undefined, undefined, 'Scraper timed out after 5 minutes')
        resolve(NextResponse.json({
          success: false,
          message: 'Scraper timed out after 5 minutes',
          output: output.slice(-500)
        }, { status: 500 }))
      }, 5 * 60 * 1000)
    })
    
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