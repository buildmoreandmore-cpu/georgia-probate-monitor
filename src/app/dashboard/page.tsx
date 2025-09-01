import { getDashboardStats, getRecentJobs } from '@/services/cases'
import { ScrapingButton } from '@/components/scraping-button'
import { StatsCard } from '@/components/StatsCard'
import { SubscriptionStatus } from '@/components/SubscriptionStatus'
import { formatDistanceToNow } from 'date-fns'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering - page queries database
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Dashboard() {
  const user = await currentUser()
  
  if (!user) {
    return <div>Please sign in to access the dashboard</div>
  }

  // Check subscription status
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  })

  const hasActiveSubscription = subscription && subscription.status === 'active'

  // Fetch data directly on server - no client-side fetching
  const stats = await getDashboardStats()
  const recentJobs = await getRecentJobs()
  
  // Get the most recent job for the "Last scraped" footer
  const lastScrapedJob = recentJobs.find((job: any) => job.status === 'completed')
  const lastScrapedHuman = lastScrapedJob?.completedAt 
    ? formatDistanceToNow(new Date(lastScrapedJob.completedAt), { addSuffix: true })
    : 'Never'

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Georgia Probate Filing Monitor</p>
        </div>
        {hasActiveSubscription && <ScrapingButton className="w-full md:w-auto" />}
      </div>

      {/* Subscription Status */}
      <div className="mb-6">
        <SubscriptionStatus />
      </div>

      {hasActiveSubscription ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatsCard 
              label="Total Cases" 
              value={stats.totalCases} 
            />
            <StatsCard 
              label="Recent Cases" 
              value={stats.recentCases} 
            />
            <StatsCard 
              label="Completed Jobs" 
              value={stats.completedJobs} 
              tone="success" 
            />
            <StatsCard 
              label="Failed Jobs" 
              value={stats.failedJobs} 
              tone="danger" 
            />
          </div>

          {/* Footer Status */}
          <div className="mt-4 pb-8">
            <p className="text-xs text-muted-foreground">Last scraped: {lastScrapedHuman}</p>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Subscription Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need an active subscription to access probate records and scraping functionality.
          </p>
        </div>
      )}
    </div>
  )
}