#!/usr/bin/env tsx

const { PrismaClient } = require('../node_modules/@prisma/client')
import { config } from 'dotenv'

// Load environment variables
config()
config({ path: '../.env.production' })

const prisma = new PrismaClient()

async function addTestData() {
  console.log('🧪 Adding test probate cases to database...')

  try {
    // Create test cases
    const testCases = [
      {
        caseId: 'test-henry-001',
        county: 'Henry',
        filingDate: new Date('2025-09-01'),
        decedentName: 'John Smith',
        decedentAddress: '123 Main St, McDonough, GA 30253',
        estateValue: 250000,
        caseNumber: 'HE-2025-001',
        attorney: 'Jane Attorney',
        status: 'active'
      },
      {
        caseId: 'test-clayton-001',
        county: 'Clayton',
        filingDate: new Date('2025-09-02'),
        decedentName: 'Mary Johnson',
        decedentAddress: '456 Oak Ave, Jonesboro, GA 30236',
        estateValue: 150000,
        caseNumber: 'CL-2025-001',
        attorney: 'Bob Lawyer',
        status: 'active'
      },
      {
        caseId: 'test-douglas-001',
        county: 'Douglas',
        filingDate: new Date('2025-09-03'),
        decedentName: 'Robert Brown',
        decedentAddress: '789 Pine Dr, Douglasville, GA 30134',
        estateValue: 300000,
        caseNumber: 'DO-2025-001',
        attorney: 'Sarah Legal',
        status: 'active'
      }
    ]

    for (const testCase of testCases) {
      // Check if case already exists
      const existing = await prisma.case.findUnique({
        where: { caseId: testCase.caseId }
      })

      if (existing) {
        console.log(`⏭️ Case ${testCase.caseId} already exists, skipping...`)
        continue
      }

      // Create the case
      const savedCase = await prisma.case.create({
        data: testCase
      })

      console.log(`✅ Added test case: ${savedCase.caseId} - ${testCase.decedentName}`)

      // Add some test contacts
      await prisma.contact.create({
        data: {
          caseId: savedCase.id,
          type: 'executor',
          name: `${testCase.decedentName} Estate Executor`
        }
      })

      // Add test property
      await prisma.parcel.create({
        data: {
          caseId: savedCase.id,
          parcelId: `${testCase.county.toLowerCase()}-parcel-001`,
          county: testCase.county,
          situsAddress: testCase.decedentAddress,
          currentOwner: testCase.decedentName,
          assessedValue: testCase.estateValue * 0.8, // Assessed at 80% of estate value
          matchConfidence: 0.9
        }
      })
    }

    console.log('\n🎉 Test data added successfully!')
    console.log('🔗 You can now view the cases at: https://www.gaprobatemonitor.com/cases')

  } catch (error) {
    console.error('❌ Error adding test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addTestData().catch(console.error)