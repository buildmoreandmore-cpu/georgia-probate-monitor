import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    console.log('Starting probate scraper...')
    
    // Run the scraper command from the local-scraper directory
    const scraperPath = join(process.cwd(), 'local-scraper')
    
    return new Promise<Response>((resolve) => {
      const scraperProcess = spawn('npm', ['run', 'scrape:all'], {
        cwd: scraperPath,
        stdio: 'pipe'
      })
      
      let output = ''
      let errors = ''
      
      scraperProcess.stdout?.on('data', (data) => {
        output += data.toString()
        console.log('Scraper output:', data.toString())
      })
      
      scraperProcess.stderr?.on('data', (data) => {
        errors += data.toString()
        console.error('Scraper error:', data.toString())
      })
      
      scraperProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Scraper completed successfully!',
            note: 'Check the cases page to see newly scraped data',
            output: output.slice(-500), // Last 500 characters
            casesUrl: '/cases'
          }))
        } else {
          resolve(NextResponse.json({
            success: false,
            message: 'Scraper failed',
            error: errors || 'Process exited with code ' + code,
            output: output.slice(-500)
          }, { status: 500 }))
        }
      })
      
      // Timeout after 5 minutes
      setTimeout(() => {
        scraperProcess.kill()
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