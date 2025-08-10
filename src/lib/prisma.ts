import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Create a mock Prisma client for build time
const createMockPrisma = () => {
  const mockCount = () => Promise.resolve(0)
  const mockFindMany = () => Promise.resolve([])
  const mockFindUnique = () => Promise.resolve(null)
  const mockCreate = () => Promise.resolve({})
  const mockUpdate = () => Promise.resolve({})
  const mockDelete = () => Promise.resolve({})
  const mockDeleteMany = () => Promise.resolve({ count: 0 })
  const mockUpsert = () => Promise.resolve({})

  return {
    case: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
    contact: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
    parcel: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
    scrapingJob: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
    phoneUpload: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
    settings: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
      upsert: mockUpsert,
    },
    $disconnect: () => Promise.resolve(),
    $connect: () => Promise.resolve(),
  }
}

// Use mock during build when database isn't available
const createPrismaClient = () => {
  // Use mock client during static generation or when database isn't available
  if (!process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV)) {
    console.log('Using mock Prisma client - no DATABASE_URL or build time')
    return createMockPrisma() as any
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as any

export default prisma