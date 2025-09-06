import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndClearDatabase() {
  try {
    console.log('🔍 Checking database contents...')
    
    const cases = await prisma.case.findMany({
      select: {
        caseId: true,
        county: true,
        decedentName: true,
        filingDate: true
      }
    })
    
    console.log(`Found ${cases.length} cases in database:`)
    
    for (const case_ of cases) {
      console.log(`- ${case_.caseId}: ${case_.decedentName} (${case_.county}, ${case_.filingDate})`)
    }
    
    if (cases.length > 0) {
      console.log('🗑️ Clearing all demo/test data from database...')
      
      // Delete in correct order due to foreign key constraints
      await prisma.parcel.deleteMany({})
      await prisma.contact.deleteMany({})
      await prisma.case.deleteMany({})
      await prisma.scrapingJob.deleteMany({})
      
      console.log('✅ Database cleared successfully')
    } else {
      console.log('✅ Database is already empty')
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndClearDatabase()