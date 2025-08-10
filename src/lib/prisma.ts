import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Create a mock Prisma client for build time
const createMockPrisma = () => {
  const mockOperation = () => Promise.resolve([])
  const mockCount = () => Promise.resolve(0)
  const mockFindMany = () => Promise.resolve([])
  const mockFindUnique = () => Promise.resolve(null)
  const mockCreate = () => Promise.resolve({})
  const mockUpdate = () => Promise.resolve({})
  const mockDelete = () => Promise.resolve({})

  return {
    case: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    contact: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    parcel: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    scrapingJob: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    phoneUpload: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    settings: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    $disconnect: () => Promise.resolve(),
    $connect: () => Promise.resolve(),
  }
}

// Use mock during build when database isn't available
const createPrismaClient = () => {
  // If no DATABASE_URL environment variable during production build, use mock
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.log('Using mock Prisma client for build')
    return createMockPrisma()
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma