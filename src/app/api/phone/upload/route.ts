import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'
import { PhoneService } from '@/services/phone/phone-service'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be CSV format' },
        { status: 400 }
      )
    }

    // Read file content
    const csvContent = await file.text()
    
    // Process with phone service
    const phoneService = new PhoneService('csv')
    const recordsLoaded = await phoneService.uploadCSVData(csvContent)

    // Save upload record
    const upload = await prisma.phoneUpload.create({
      data: {
        filename: file.name,
        records: recordsLoaded
      }
    })

    return NextResponse.json({
      message: 'Phone data uploaded successfully',
      recordsLoaded,
      uploadId: upload.id
    })

  } catch (error) {
    console.error('Error uploading phone data:', error)
    return NextResponse.json(
      { error: 'Failed to process phone data' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Get upload history
    const uploads = await prisma.phoneUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 20
    })

    // Get current data size
    const phoneService = new PhoneService('csv')
    const currentDataSize = phoneService.getCSVDataSize()

    return NextResponse.json({
      uploads,
      currentDataSize
    })

  } catch (error) {
    console.error('Error fetching phone upload data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}