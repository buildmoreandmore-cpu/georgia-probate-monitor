import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = rateLimiter.allow(clientId)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Clear existing demo data
    await prisma.parcel.deleteMany({})
    await prisma.contact.deleteMany({})
    await prisma.case.deleteMany({})

    // Create comprehensive demo data
    const demoCases = [
      {
        caseId: 'DEMO-2024-001',
        county: 'cobb',
        filingDate: new Date('2024-01-15'),
        decedentName: 'Eleanor Richardson',
        decedentAddress: '1425 Roswell Rd',
        decedentCity: 'Marietta',
        decedentState: 'GA',
        decedentZipcode: '30062',
        estateValue: 850000,
        caseNumber: '24-ES-001',
        attorney: 'Patricia Williams, Esq.',
        attorneyPhone: '(770) 555-0123',
        courtUrl: 'https://probateonline.cobbcounty.org/demo/case/001',
        status: 'active',
        petitionerFirstName: 'James',
        petitionerLastName: 'Richardson',
        petitionerAddress: '892 Piedmont Ave',
        petitionerCity: 'Atlanta',
        petitionerState: 'GA',
        petitionerZipcode: '30309',
        petitionerPhone: '(770) 555-0456',
        petitionerEmail: 'james.richardson@email.com'
      },
      {
        caseId: 'DEMO-2024-002',
        county: 'fulton',
        filingDate: new Date('2024-02-03'),
        decedentName: 'Robert James Thompson',
        decedentAddress: '3847 Peachtree Rd NE',
        decedentCity: 'Atlanta',
        decedentState: 'GA',
        decedentZipcode: '30309',
        estateValue: 1200000,
        caseNumber: '24-ES-002',
        attorney: 'Michael Chen, Esq.',
        attorneyPhone: '(404) 555-0789',
        courtUrl: 'https://fulton.probate.court.gov/demo/case/002',
        status: 'active',
        petitionerFirstName: 'Lisa',
        petitionerLastName: 'Thompson-Martinez',
        petitionerAddress: '1256 Virginia Ave',
        petitionerCity: 'Atlanta',
        petitionerState: 'GA',
        petitionerZipcode: '30306',
        petitionerPhone: '(404) 555-0892',
        petitionerEmail: 'lisa.martinez@email.com'
      },
      {
        caseId: 'DEMO-2024-003',
        county: 'dekalb',
        filingDate: new Date('2024-01-28'),
        decedentName: 'Maria Gonzalez Davis',
        decedentAddress: '2156 Clairmont Rd',
        decedentCity: 'Atlanta',
        decedentState: 'GA',
        decedentZipcode: '30329',
        estateValue: 425000,
        caseNumber: '24-ES-003',
        attorney: 'Sarah Johnson, Esq.',
        courtUrl: 'https://dekalb.probate.court.gov/demo/case/003',
        status: 'active',
        petitionerFirstName: 'Carlos',
        petitionerLastName: 'Davis',
        petitionerAddress: '3489 Memorial Dr SE',
        petitionerCity: 'Atlanta',
        petitionerState: 'GA',
        petitionerZipcode: '30032',
        petitionerPhone: '(678) 555-0234',
        petitionerEmail: 'carlos.davis@email.com'
      }
    ]

    const savedCases = []

    for (const demoCase of demoCases) {
      const savedCase = await prisma.case.create({
        data: demoCase
      })
      savedCases.push(savedCase)

      // Add contacts for each case
      const contacts = [
        {
          caseId: (savedCase as any).id,
          type: 'executor',
          name: `${demoCase.decedentName.split(' ')[0]} ${demoCase.decedentName.split(' ').pop()} Jr.`,
          originalAddress: `${Math.floor(Math.random() * 9999) + 1000} Demo St, ${demoCase.county === 'cobb' ? 'Marietta' : demoCase.county === 'fulton' ? 'Atlanta' : 'Decatur'}, GA 30${Math.floor(Math.random() * 900) + 100}`,
          standardizedAddress: `${Math.floor(Math.random() * 9999) + 1000} DEMO ST, ${demoCase.county === 'cobb' ? 'MARIETTA' : demoCase.county === 'fulton' ? 'ATLANTA' : 'DECATUR'}, GA 30${Math.floor(Math.random() * 900) + 100}-0000`,
          upsDeliverable: Math.random() > 0.2,
          phone: `(${demoCase.county === 'cobb' ? '770' : demoCase.county === 'fulton' ? '404' : '678'}) 555-${Math.floor(Math.random() * 9000) + 1000}`,
          phoneSource: 'csv',
          phoneConfidence: 0.85 + Math.random() * 0.15
        },
        {
          caseId: (savedCase as any).id,
          type: 'administrator',
          name: `Demo Administrator ${Math.floor(Math.random() * 100)}`,
          originalAddress: `${Math.floor(Math.random() * 9999) + 1000} Admin Ave, ${demoCase.county === 'cobb' ? 'Kennesaw' : demoCase.county === 'fulton' ? 'Sandy Springs' : 'Stone Mountain'}, GA 30${Math.floor(Math.random() * 900) + 100}`,
          standardizedAddress: `${Math.floor(Math.random() * 9999) + 1000} ADMIN AVE, ${demoCase.county === 'cobb' ? 'KENNESAW' : demoCase.county === 'fulton' ? 'SANDY SPRINGS' : 'STONE MOUNTAIN'}, GA 30${Math.floor(Math.random() * 900) + 100}-0000`,
          upsDeliverable: Math.random() > 0.3,
          phone: Math.random() > 0.4 ? `(${demoCase.county === 'cobb' ? '770' : demoCase.county === 'fulton' ? '404' : '678'}) 555-${Math.floor(Math.random() * 9000) + 1000}` : null,
          phoneSource: Math.random() > 0.5 ? 'csv' : 'provider',
          phoneConfidence: 0.70 + Math.random() * 0.25
        }
      ]

      for (const contact of contacts) {
        await prisma.contact.create({ data: contact })
      }

      // Add parcels for each case
      const parcels = [
        {
          caseId: (savedCase as any).id,
          parcelId: `${demoCase.county.toUpperCase()}-${Math.floor(Math.random() * 900000) + 100000}`,
          county: demoCase.county,
          situsAddress: demoCase.decedentAddress,
          taxMailingAddress: demoCase.decedentAddress,
          currentOwner: demoCase.decedentName.toUpperCase(),
          lastSaleDate: new Date(2018 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          assessedValue: Math.floor(demoCase.estateValue * (0.6 + Math.random() * 0.3)),
          legalDescription: `LOT ${Math.floor(Math.random() * 50) + 1}, BLOCK ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}, DEMO SUBDIVISION`,
          qpublicUrl: `https://qpublic.schneidercorp.com/demo/${demoCase.county}/parcel/${Math.floor(Math.random() * 900000) + 100000}`,
          matchConfidence: 0.85 + Math.random() * 0.14
        }
      ]

      // Sometimes add a second property
      if (Math.random() > 0.6) {
        parcels.push({
          caseId: (savedCase as any).id,
          parcelId: `${demoCase.county.toUpperCase()}-${Math.floor(Math.random() * 900000) + 100000}`,
          county: demoCase.county,
          situsAddress: `${Math.floor(Math.random() * 9999) + 1000} Investment Dr, ${demoCase.county === 'cobb' ? 'Acworth' : demoCase.county === 'fulton' ? 'Roswell' : 'Lithonia'}, GA 30${Math.floor(Math.random() * 900) + 100}`,
          taxMailingAddress: demoCase.decedentAddress, // Tax bills go to main address
          currentOwner: demoCase.decedentName.toUpperCase(),
          lastSaleDate: new Date(2015 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          assessedValue: Math.floor((demoCase.estateValue * 0.3) * (0.8 + Math.random() * 0.4)),
          legalDescription: `LOT ${Math.floor(Math.random() * 50) + 1}, BLOCK ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}, INVESTMENT SUBDIVISION`,
          qpublicUrl: `https://qpublic.schneidercorp.com/demo/${demoCase.county}/parcel/${Math.floor(Math.random() * 900000) + 100000}`,
          matchConfidence: 0.75 + Math.random() * 0.20
        })
      }

      for (const parcel of parcels) {
        await prisma.parcel.create({ data: parcel })
      }
    }

    // Create some scraping job history
    const jobs = [
      {
        county: 'cobb',
        source: 'georgia_probate_records',
        status: 'completed',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000), // 5 minutes later
        recordsFound: 2
      },
      {
        county: 'fulton',
        source: 'georgia_probate_records',
        status: 'completed',
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 8 * 60 * 1000), // 8 minutes later
        recordsFound: 1
      },
      {
        county: 'dekalb',
        source: 'georgia_probate_records',
        status: 'running',
        startedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        recordsFound: 0
      }
    ]

    for (const job of jobs) {
      await prisma.scrapingJob.create({ data: job })
    }

    return NextResponse.json({
      message: 'Demo data created successfully',
      cases: savedCases.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error creating demo data:', error)
    return NextResponse.json(
      { error: 'Failed to create demo data' },
      { status: 500 }
    )
  }
}