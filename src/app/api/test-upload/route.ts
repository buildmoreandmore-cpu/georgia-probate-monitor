import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('Received scraper data:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      timestamp: new Date().toISOString(),
      receivedCases: Array.isArray(data.cases) ? data.cases.length : 0,
      data: data
    })
  } catch (error) {
    console.error('Test upload failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test upload endpoint is working',
    timestamp: new Date().toISOString()
  })
}