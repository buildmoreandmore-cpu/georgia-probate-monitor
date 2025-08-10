import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardStats, getRecentJobs } from '@/services/cases'
import { ScrapingButton } from '@/components/scraping-button'

// Cache for 2 minutes - dashboard data changes frequently
export const revalidate = 120

export default async function Dashboard() {
  // Fetch data directly on server - no client-side fetching
  const stats = await getDashboardStats()
  const recentJobs = await getRecentJobs()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Georgia Probate Filing Monitor
          </p>
        </div>
        <ScrapingButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCases}</div>
            <p className="text-xs text-muted-foreground">
              All probate cases in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentCases}</div>
            <p className="text-xs text-muted-foreground">
              Filed in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Successful scraping runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Scraping errors
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scraping Jobs</CardTitle>
          <CardDescription>
            Latest scraping activity and results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No scraping jobs found. Start your first scraping job above.
            </p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      job.status === 'completed' ? 'bg-green-500' : 
                      job.status === 'failed' ? 'bg-red-500' : 
                      job.status === 'running' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <div className="font-medium capitalize">
                        {job.county} - {job.source.replace('_', ' ')}
                      </div>
                      {job.errorMessage && (
                        <div className="text-xs text-red-600">{job.errorMessage}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {job.recordsFound} records
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.startedAt ? new Date(job.startedAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}