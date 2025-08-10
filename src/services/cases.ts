import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export interface CaseData {
  id: string
  caseId: string
  county: string
  filingDate: string
  decedentName: string
  decedentAddress?: string
  estateValue?: number
  status: string
  contacts: Array<{
    id: string
    type: string
    name: string
    phone?: string
  }>
  parcels: Array<{
    id: string
    situsAddress?: string
    assessedValue?: number
  }>
}

export interface ListCasesParams {
  county?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// Cache the function to avoid repeated database calls during SSG
export const listCases = cache(async (params: ListCasesParams = {}) => {
  const {
    county,
    status = 'active',
    dateFrom,
    dateTo,
    page = 1,
    limit = 20
  } = params

  // Build where clause
  const where: any = { status }
  if (county) where.county = county
  if (dateFrom || dateTo) {
    where.filingDate = {}
    if (dateFrom) where.filingDate.gte = new Date(dateFrom)
    if (dateTo) where.filingDate.lte = new Date(dateTo)
  }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        contacts: true,
        parcels: true
      },
      orderBy: { filingDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.case.count({ where })
  ])

  return {
    data: cases.map((case_: any) => ({
      ...case_,
      filingDate: case_.filingDate.toISOString(),
      decedentAddress: case_.decedentAddress || undefined,
      estateValue: case_.estateValue || undefined,
      caseNumber: case_.caseNumber || undefined,
      attorney: case_.attorney || undefined,
      attorneyPhone: case_.attorneyPhone || undefined,
      courtUrl: case_.courtUrl || undefined,
      notes: case_.notes || undefined
    })) as CaseData[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})

export const getCaseById = cache(async (id: string) => {
  return await prisma.case.findUnique({
    where: { id },
    include: {
      contacts: true,
      parcels: true
    }
  })
})

export const getDashboardStats = cache(async () => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [totalCases, recentCases, completedJobs, failedJobs] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({
      where: {
        filingDate: { gte: weekAgo }
      }
    }),
    prisma.scrapingJob.count({
      where: { status: 'completed' }
    }),
    prisma.scrapingJob.count({
      where: { status: 'failed' }
    })
  ])

  return {
    totalCases,
    recentCases,
    completedJobs,
    failedJobs
  }
})

export const getRecentJobs = cache(async () => {
  return await prisma.scrapingJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  })
})