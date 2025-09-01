import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Create Subscription table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        "userId" TEXT NOT NULL UNIQUE,
        "stripeCustomerId" TEXT UNIQUE,
        "stripeSubscriptionId" TEXT UNIQUE,
        "stripePriceId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'inactive',
        "currentPeriodStart" TIMESTAMP(3),
        "currentPeriodEnd" TIMESTAMP(3),
        "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create Payment table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        "userId" TEXT NOT NULL,
        "stripePaymentId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "currency" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId")
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId")
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId")
    `

    return NextResponse.json({
      message: 'Subscription and Payment tables created successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error creating tables:', error)
    return NextResponse.json(
      { error: 'Failed to create tables', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}