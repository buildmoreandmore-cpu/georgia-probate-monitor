import { PrismaClient } from '@prisma/client'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function ensureDbDirectory() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './tmp/database.db'
  const dbDir = dirname(dbPath)
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
}

function initializeDatabase() {
  if (typeof window === 'undefined') {
    ensureDbDirectory()
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

// Initialize database directory on serverless environments
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  initializeDatabase()
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma