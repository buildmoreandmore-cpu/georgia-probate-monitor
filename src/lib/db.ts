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

// Initialize database directory
ensureDbDirectory()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma