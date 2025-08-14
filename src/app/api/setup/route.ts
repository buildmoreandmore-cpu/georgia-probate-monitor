import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Try to connect to the database and create tables if they don't exist
    // This is a manual table creation since migration isn't available in serverless
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Case" (
        "id" TEXT NOT NULL,
        "caseId" TEXT NOT NULL,
        "county" TEXT NOT NULL,
        "filingDate" TIMESTAMP(3) NOT NULL,
        "decedentName" TEXT NOT NULL,
        "decedentAddress" TEXT,
        "decedentCity" TEXT,
        "decedentState" TEXT,
        "decedentZipcode" TEXT,
        "estateValue" DOUBLE PRECISION,
        "caseNumber" TEXT,
        "attorney" TEXT,
        "attorneyPhone" TEXT,
        "courtUrl" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "notes" TEXT,
        "petitionerFirstName" TEXT,
        "petitionerLastName" TEXT,
        "petitionerAddress" TEXT,
        "petitionerCity" TEXT,
        "petitionerState" TEXT,
        "petitionerZipcode" TEXT,
        "petitionerPhone" TEXT,
        "petitionerEmail" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
      );
    `

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Case_caseId_key" ON "Case"("caseId");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Case_county_idx" ON "Case"("county");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Case_filingDate_idx" ON "Case"("filingDate");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Case_estateValue_idx" ON "Case"("estateValue");
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Contact" (
        "id" TEXT NOT NULL,
        "caseId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "originalAddress" TEXT,
        "standardizedAddress" TEXT,
        "upsDeliverable" BOOLEAN NOT NULL DEFAULT false,
        "phone" TEXT,
        "phoneSource" TEXT,
        "phoneConfidence" DOUBLE PRECISION DEFAULT 0,
        "email" TEXT,
        "relationship" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
      );
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Contact_caseId_idx" ON "Contact"("caseId");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Contact_type_idx" ON "Contact"("type");
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Parcel" (
        "id" TEXT NOT NULL,
        "caseId" TEXT NOT NULL,
        "parcelId" TEXT NOT NULL,
        "county" TEXT NOT NULL,
        "situsAddress" TEXT,
        "taxMailingAddress" TEXT,
        "currentOwner" TEXT,
        "lastSaleDate" TIMESTAMP(3),
        "assessedValue" DOUBLE PRECISION,
        "legalDescription" TEXT,
        "qpublicUrl" TEXT,
        "matchConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
      );
    `

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Parcel_parcelId_key" ON "Parcel"("parcelId");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Parcel_caseId_idx" ON "Parcel"("caseId");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Parcel_county_idx" ON "Parcel"("county");
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ScrapingJob" (
        "id" TEXT NOT NULL,
        "county" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "startedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "recordsFound" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ScrapingJob_pkey" PRIMARY KEY ("id")
      );
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ScrapingJob_county_idx" ON "ScrapingJob"("county");
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ScrapingJob_status_idx" ON "ScrapingJob"("status");
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PhoneUpload" (
        "id" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "records" INTEGER NOT NULL DEFAULT 0,
        "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PhoneUpload_pkey" PRIMARY KEY ("id")
      );
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Settings_pkey" PRIMARY KEY ("key")
      );
    `

    // Add foreign key constraints
    await prisma.$executeRaw`
      ALTER TABLE "Contact" 
      DROP CONSTRAINT IF EXISTS "Contact_caseId_fkey";
    `

    await prisma.$executeRaw`
      ALTER TABLE "Contact" 
      ADD CONSTRAINT "Contact_caseId_fkey" 
      FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `

    await prisma.$executeRaw`
      ALTER TABLE "Parcel" 
      DROP CONSTRAINT IF EXISTS "Parcel_caseId_fkey";
    `

    await prisma.$executeRaw`
      ALTER TABLE "Parcel" 
      ADD CONSTRAINT "Parcel_caseId_fkey" 
      FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `

    return NextResponse.json({
      message: 'Database tables created successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error setting up database:', error)
    return NextResponse.json(
      { error: 'Failed to setup database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}