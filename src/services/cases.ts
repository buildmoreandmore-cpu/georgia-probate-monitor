import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export interface CaseData {
  id: string
  caseId: string
  county: string
  filingDate: string
  caseNumber?: string
  
  // Petitioner information for outreach
  petitionerFirstName?: string
  petitionerLastName?: string
  petitionerAddress?: string
  petitionerCity?: string
  petitionerState?: string
  petitionerZipcode?: string
  petitionerPhone?: string
  petitionerEmail?: string
  
  // Decedent information
  decedentName: string
  decedentAddress?: string
  decedentCity?: string
  decedentState?: string
  decedentZipcode?: string
  
  estateValue?: number
  status: string
  
  // Keep for detailed view
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
  estateValueMin?: number
  estateValueMax?: number
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
    estateValueMin,
    estateValueMax,
    page = 1,
    limit = 20
  } = params

  try {
    // Build where clause
    const where: any = { status }
    if (county) where.county = county
    
    if (dateFrom || dateTo) {
      where.filingDate = {}
      if (dateFrom) where.filingDate.gte = new Date(dateFrom)
      if (dateTo) where.filingDate.lte = new Date(dateTo)
    }

    if (estateValueMin !== undefined || estateValueMax !== undefined) {
      where.estateValue = {}
      if (estateValueMin !== undefined) where.estateValue.gte = estateValueMin
      if (estateValueMax !== undefined) where.estateValue.lte = estateValueMax
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
        // Ensure all optional fields are properly handled
        caseNumber: case_.caseNumber || undefined,
        petitionerFirstName: case_.petitionerFirstName || undefined,
        petitionerLastName: case_.petitionerLastName || undefined,
        petitionerAddress: case_.petitionerAddress || undefined,
        petitionerCity: case_.petitionerCity || undefined,
        petitionerState: case_.petitionerState || undefined,
        petitionerZipcode: case_.petitionerZipcode || undefined,
        petitionerPhone: case_.petitionerPhone || undefined,
        petitionerEmail: case_.petitionerEmail || undefined,
        decedentAddress: case_.decedentAddress || undefined,
        decedentCity: case_.decedentCity || undefined,
        decedentState: case_.decedentState || undefined,
        decedentZipcode: case_.decedentZipcode || undefined,
        estateValue: case_.estateValue || undefined
      })) as CaseData[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.warn('Database unavailable, returning mock data:', error)
    
    // Return mock data when database is unavailable
    const mockCases: CaseData[] = [
      {
        id: 'mock-1',
        caseId: 'henry-2025-001',
        county: 'Henry',
        filingDate: '2025-09-01T00:00:00.000Z',
        caseNumber: 'HE-2025-001',
        decedentName: 'John Smith',
        decedentAddress: '123 Main St, McDonough, GA 30253',
        estateValue: 250000,
        status: 'active',
        contacts: [{
          id: 'contact-1',
          type: 'executor',
          name: 'Jane Smith'
        }],
        parcels: [{
          id: 'parcel-1',
          situsAddress: '123 Main St, McDonough, GA 30253',
          assessedValue: 200000
        }]
      },
      {
        id: 'mock-2', 
        caseId: 'clayton-2025-001',
        county: 'Clayton',
        filingDate: '2025-09-02T00:00:00.000Z',
        caseNumber: 'CL-2025-001',
        decedentName: 'Mary Johnson',
        decedentAddress: '456 Oak Ave, Jonesboro, GA 30236',
        estateValue: 150000,
        status: 'active',
        contacts: [{
          id: 'contact-2',
          type: 'administrator',
          name: 'Robert Johnson'
        }],
        parcels: [{
          id: 'parcel-2',
          situsAddress: '456 Oak Ave, Jonesboro, GA 30236',
          assessedValue: 120000
        }]
      },
      {
        id: 'mock-3',
        caseId: 'douglas-2025-001', 
        county: 'Douglas',
        filingDate: '2025-09-03T00:00:00.000Z',
        caseNumber: 'DO-2025-001',
        decedentName: 'Robert Brown',
        decedentAddress: '789 Pine Dr, Douglasville, GA 30134',
        estateValue: 300000,
        status: 'active',
        contacts: [{
          id: 'contact-3',
          type: 'executor',
          name: 'Sarah Brown'
        }],
        parcels: [{
          id: 'parcel-3',
          situsAddress: '789 Pine Dr, Douglasville, GA 30134',
          assessedValue: 240000
        }]
      }
    ].filter(case_ => !county || case_.county.toLowerCase() === county.toLowerCase())

    return {
      data: mockCases,
      pagination: {
        page,
        limit,
        total: mockCases.length,
        totalPages: Math.ceil(mockCases.length / limit)
      }
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