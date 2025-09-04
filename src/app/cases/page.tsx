import dayjs from 'dayjs'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering - page queries database
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CasesPage() {
  // Get today's date range (start of today to start of tomorrow)
  const today = dayjs()
  const startOfToday = today.startOf('day').toDate()
  const startOfTomorrow = today.add(1, 'day').startOf('day').toDate()

  try {
    // Query cases filed today only
    const todaysCases = await prisma.case.findMany({
      where: {
        filingDate: {
          gte: startOfToday,
          lt: startOfTomorrow
        }
      },
      orderBy: {
        filingDate: 'desc'
      },
      select: {
        id: true,
        decedentName: true,
        county: true,
        filingDate: true,
        caseNumber: true
      }
    })

    return (
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Today&apos;s Probate Filings
            </h1>
            <p className="text-muted-foreground">
              Cases filed on {today.format('MMMM D, YYYY')} ({todaysCases.length} found)
            </p>
          </div>

          {todaysCases.length === 0 ? (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No filings today</h3>
              <p className="text-muted-foreground">
                No probate cases were filed today. Check back tomorrow or run the scraper to get the latest data.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-6">
                <div className="space-y-4">
                  {todaysCases.map((case_: any) => (
                    <div 
                      key={case_.id}
                      className="border-b last:border-b-0 pb-4 last:pb-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {case_.decedentName}
                          </h3>
                          <p className="text-muted-foreground">
                            {case_.county} County
                            {case_.caseNumber && ` • ${case_.caseNumber}`}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          Filed: {dayjs(case_.filingDate).format('h:mm A')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )

  } catch (error) {
    console.error('Failed to fetch today&apos;s cases:', error)
    
    // Fallback to show sample today's cases when database fails
    const sampleTodaysCases = [
      {
        id: 'sample-1',
        decedentName: 'Jane Williams',
        county: 'Fulton',
        filingDate: today.toDate(),
        caseNumber: 'FU-2025-001'
      }
    ]
    
    return (
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Today&apos;s Probate Filings
            </h1>
            <p className="text-muted-foreground">
              Cases filed on {today.format('MMMM D, YYYY')} ({sampleTodaysCases.length} found)
              <span className="text-red-500 ml-2">(Database connection failed - showing sample data)</span>
            </p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="space-y-4">
                {sampleTodaysCases.map((case_: any) => (
                  <div 
                    key={case_.id}
                    className="border-b last:border-b-0 pb-4 last:pb-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {case_.decedentName}
                        </h3>
                        <p className="text-muted-foreground">
                          {case_.county} County
                          {case_.caseNumber && ` • ${case_.caseNumber}`}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        Filed: {dayjs(case_.filingDate).format('h:mm A')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}