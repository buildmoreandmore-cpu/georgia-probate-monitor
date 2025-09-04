import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    version: '3.1-force-deploy',
    status: 'deployed',
    features: [
      'Real scraper API (not test)',
      'Smart date filtering with dayjs', 
      'Master npm run scrape:all command',
      'Dashboard Run Scraper button',
      'Parallel scraping functionality'
    ],
    commit: '29bb093',
    buildId: Math.random().toString(36).substring(7)
  }
  
  return NextResponse.json(deploymentInfo)
}