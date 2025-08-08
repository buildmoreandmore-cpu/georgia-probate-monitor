'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardStats {
  totalCases: number
  recentCases: number
  completedJobs: number
  failedJobs: number
}

interface ScrapingJob {
  id: string
  county: string
  source: string
  status: string
  startedAt: string
  completedAt?: string
  recordsFound: number
  errorMessage?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    recentCases: 0,
    completedJobs: 0,
    failedJobs: 0
  })
  const [recentJobs, setRecentJobs] = useState<ScrapingJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScraping, setIsScraping] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch cases
      const casesResponse = await fetch('/api/cases?limit=1000')
      const casesData = await casesResponse.json()
      
      // Fetch scraping jobs
      const jobsResponse = await fetch('/api/scrape')
      const jobsData = await jobsResponse.json()

      const allCases = casesData.data || []
      const allJobs = jobsData.data || []

      // Calculate stats
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const recentCases = allCases.filter((c: any) => 
        new Date(c.filingDate) > weekAgo
      ).length

      const completedJobs = allJobs.filter((j: ScrapingJob) => 
        j.status === 'completed'
      ).length

      const failedJobs = allJobs.filter((j: ScrapingJob) => 
        j.status === 'failed'
      ).length

      setStats({
        totalCases: allCases.length,
        recentCases,
        completedJobs,
        failedJobs
      })

      setRecentJobs(allJobs.slice(0, 10))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startScraping = async () => {
    setIsScraping(true)
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counties: ['cobb', 'dekalb', 'fulton'],
          sources: ['georgia_probate_records', 'cobb_probate']
        })
      })
      
      if (response.ok) {
        alert('Scraping job started successfully!')
        await fetchDashboardData()
      } else {
        alert('Failed to start scraping job')
      }
    } catch (error) {
      console.error('Error starting scraping:', error)
      alert('Error starting scraping job')
    } finally {
      setIsScraping(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Georgia Probate Filing Monitor
          </p>
        </div>
        <Button 
          onClick={startScraping} 
          disabled={isScraping}
        >
          {isScraping ? 'Running...' : 'Start Scraping'}
        </Button>
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
              {recentJobs.map((job) => (
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
                      {new Date(job.startedAt).toLocaleDateString()}
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