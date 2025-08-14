import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Add new columns to existing Case table
    await prisma.$executeRaw`
      ALTER TABLE "Case" 
      ADD COLUMN IF NOT EXISTS "decedentCity" TEXT,
      ADD COLUMN IF NOT EXISTS "decedentState" TEXT,
      ADD COLUMN IF NOT EXISTS "decedentZipcode" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerFirstName" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerLastName" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerCity" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerState" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerZipcode" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerPhone" TEXT,
      ADD COLUMN IF NOT EXISTS "petitionerEmail" TEXT;
    `

    // Add index for estate value if it doesn't exist
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Case_estateValue_idx" ON "Case"("estateValue");
    `

    return NextResponse.json({
      message: 'Schema migration completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error migrating schema:', error)
    return NextResponse.json(
      { error: 'Failed to migrate schema', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}