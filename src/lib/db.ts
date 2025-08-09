import { PrismaClient } from '@prisma/client'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function ensureDbDirectory() {
  if (typeof window !== 'undefined') return
  
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db'
  const dbDir = dirname(dbPath)
  
  if (!existsSync(dbDir) && dbDir !== '.') {
    mkdirSync(dbDir, { recursive: true })
  }
}

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    // This will create the tables if they don't exist using Prisma's schema
    await prisma.$connect()
    
    // Try to create tables - if they exist, this will be ignored
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Case" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "caseNumber" TEXT NOT NULL,
        "county" TEXT NOT NULL,
        "filingDate" DATETIME NOT NULL,
        "decedentName" TEXT NOT NULL,
        "decedentAddress" TEXT,
        "estateValue" REAL,
        "attorney" TEXT,
        "attorneyPhone" TEXT,
        "courtUrl" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Contact" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "address" TEXT,
        "phone" TEXT,
        "relationship" TEXT,
        "caseId" TEXT NOT NULL,
        FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Parcel" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "parcelId" TEXT NOT NULL,
        "county" TEXT NOT NULL,
        "situsAddress" TEXT NOT NULL,
        "taxMailingAddress" TEXT,
        "currentOwner" TEXT NOT NULL,
        "lastSaleDate" DATETIME,
        "lastSalePrice" REAL,
        "marketValue" REAL,
        "taxAssessedValue" REAL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PhoneRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "address" TEXT,
        "uploadId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PhoneUpload" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "filename" TEXT NOT NULL,
        "recordCount" INTEGER NOT NULL,
        "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ScrapingJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "county" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "startedAt" DATETIME,
        "completedAt" DATETIME,
        "recordsFound" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `
  } catch (error) {
    console.warn('Database initialization warning:', error)
    // Continue even if there are errors - tables might already exist
  }
}

// Initialize database directory
ensureDbDirectory()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { initializeDatabase }