import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default settings
  const defaultSettings = [
    { key: 'address_provider', value: 'free' },
    { key: 'phone_provider', value: 'csv' },
    { key: 'rate_limit_rpm', value: '60' },
    { key: 'scrape_delay_ms', value: '2000' },
    { key: 'enabled_counties', value: 'cobb,dekalb,fulton' },
    { key: 'cron_schedule', value: '0 6 * * *' },
    { key: 'last_scrape_date', value: new Date().toISOString() }
  ]

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  // Create sample data for testing
  const sampleCase = await prisma.case.upsert({
    where: { caseId: 'SAMPLE-2024-001' },
    update: {},
    create: {
      caseId: 'SAMPLE-2024-001',
      county: 'cobb',
      filingDate: new Date('2024-01-15'),
      decedentName: 'John Doe',
      decedentAddress: '123 Main St, Marietta, GA 30060',
      estateValue: 250000,
      caseNumber: '24-ES-001',
      attorney: 'Jane Smith, Esq.',
      attorneyPhone: '(770) 555-0123',
      courtUrl: 'https://probateonline.cobbcounty.org/case/123',
      status: 'active'
    }
  })

  await prisma.contact.upsert({
    where: { id: 'sample-contact-1' },
    update: {},
    create: {
      id: 'sample-contact-1',
      caseId: sampleCase.id,
      type: 'executor',
      name: 'Mary Doe',
      originalAddress: '456 Oak Ave, Marietta, GA 30062',
      standardizedAddress: '456 OAK AVE, MARIETTA, GA 30062-1234',
      upsDeliverable: true,
      phone: '(770) 555-0456',
      phoneSource: 'csv',
      phoneConfidence: 0.95
    }
  })

  await prisma.parcel.upsert({
    where: { parcelId: 'SAMPLE-PARCEL-001' },
    update: {},
    create: {
      parcelId: 'SAMPLE-PARCEL-001',
      caseId: sampleCase.id,
      county: 'cobb',
      situsAddress: '123 Main St, Marietta, GA 30060',
      taxMailingAddress: '123 Main St, Marietta, GA 30060',
      currentOwner: 'JOHN DOE',
      lastSaleDate: new Date('2020-05-15'),
      assessedValue: 180000,
      legalDescription: 'LOT 1, BLOCK A, MAIN STREET SUBDIVISION',
      qpublicUrl: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1051&LayerID=23951&PageTypeID=4&PageID=9968&KeyValue=123456',
      matchConfidence: 0.98
    }
  })

  console.log('Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })