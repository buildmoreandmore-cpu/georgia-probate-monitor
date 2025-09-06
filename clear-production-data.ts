import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAllData() {
  try {
    console.log('🗑️  Clearing all data from production database...')
    
    // Delete in correct order due to foreign key constraints
    const deletedParcels = await prisma.parcel.deleteMany({})
    console.log(`Deleted ${deletedParcels.count} parcels`)
    
    const deletedContacts = await prisma.contact.deleteMany({})
    console.log(`Deleted ${deletedContacts.count} contacts`)
    
    const deletedCases = await prisma.case.deleteMany({})
    console.log(`Deleted ${deletedCases.count} cases`)
    
    const deletedJobs = await prisma.scrapingJob.deleteMany({})
    console.log(`Deleted ${deletedJobs.count} scraping jobs`)
    
    console.log('✅ Successfully cleared all data from production database')
  } catch (error) {
    console.error('❌ Error clearing data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAllData()