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

  console.log('Database settings initialized successfully! (No sample data created)')
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