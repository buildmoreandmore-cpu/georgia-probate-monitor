import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Analyze database connection details
    const connectionInfo = {
      databaseUrl: process.env.DATABASE_URL?.includes('supabase.co') || false,
      directUrl: process.env.DIRECT_URL?.includes('supabase.co') || false,
      hostPattern: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.match(/([a-zA-Z0-9-]+\.supabase\.co)/)?.[1] || 'unknown' : 'missing',
      databaseName: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.match(/\/([^?]+)/)?.[1] || 'unknown' : 'missing'
    }

    // Test database connectivity and get basic info
    let connectionTest = {
      connected: false,
      error: null as string | null,
      tableCount: 0,
      caseCount: 0,
      subscriptionTableExists: false
    }

    try {
      // Test basic connection
      await prisma.$queryRaw`SELECT 1`
      connectionTest.connected = true

      // Get table count
      const tables = await prisma.$queryRaw<Array<{count: number}>>`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      connectionTest.tableCount = Number(tables[0]?.count || 0)

      // Check case count
      const caseCount = await prisma.case.count()
      connectionTest.caseCount = caseCount

      // Check if subscription table exists
      try {
        await prisma.subscription.findMany({ take: 1 })
        connectionTest.subscriptionTableExists = true
      } catch {
        connectionTest.subscriptionTableExists = false
      }

    } catch (error: any) {
      connectionTest.error = error.message
    }

    return NextResponse.json({
      status: 'success',
      connectionInfo,
      connectionTest,
      isSupabase: connectionInfo.databaseUrl && connectionInfo.directUrl,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Supabase verification error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}