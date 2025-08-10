import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing scraping environment...')
    
    // Test basic Playwright import
    let playwrightError = null
    let chromiumError = null
    
    try {
      const playwright = await import('playwright')
      console.log('Playwright imported successfully')
      
      try {
        const { chromium } = playwright
        console.log('Chromium imported successfully')
        
        // Try to launch browser
        console.log('Attempting to launch Chromium...')
        const browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions'
          ]
        })
        console.log('Chromium launched successfully')
        
        const page = await browser.newPage()
        console.log('New page created')
        
        await page.goto('https://httpbin.org/json', { waitUntil: 'networkidle' })
        console.log('Test navigation successful')
        
        await browser.close()
        console.log('Browser closed successfully')
        
      } catch (error) {
        chromiumError = error instanceof Error ? error.message : String(error)
        console.error('Chromium error:', chromiumError)
      }
      
    } catch (error) {
      playwrightError = error instanceof Error ? error.message : String(error)
      console.error('Playwright import error:', playwrightError)
    }
    
    return NextResponse.json({
      success: !playwrightError && !chromiumError,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        vercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV
      },
      errors: {
        playwright: playwrightError,
        chromium: chromiumError
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Test scraping failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}