import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and schema
    const checks: any = {
      connection: false,
      subscriptionTable: false,
      paymentTable: false,
      caseTable: false,
      scrapingJobTable: false,
    }

    // Test connection
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.connection = true
    } catch (error) {
      console.error('Connection test failed:', error)
    }

    // Test Subscription table
    try {
      await prisma.subscription.findMany({ take: 1 })
      checks.subscriptionTable = true
    } catch (error) {
      console.error('Subscription table test failed:', error)
    }

    // Test Payment table
    try {
      await prisma.payment.findMany({ take: 1 })
      checks.paymentTable = true
    } catch (error) {
      console.error('Payment table test failed:', error)
    }

    // Test existing tables
    try {
      const caseCount = await prisma.case.count()
      checks.caseTable = true
      checks.caseCount = caseCount
    } catch (error) {
      console.error('Case table test failed:', error)
    }

    try {
      const jobCount = await prisma.scrapingJob.count()
      checks.scrapingJobTable = true
      checks.jobCount = jobCount
    } catch (error) {
      console.error('ScrapingJob table test failed:', error)
    }

    return NextResponse.json({
      status: 'success',
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}