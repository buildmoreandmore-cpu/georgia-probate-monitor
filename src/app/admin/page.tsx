'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SystemHealth {
  status: string
  timestamp: string
  database: string
  cases: number
  environment: string
  deployment: string
}

export default function AdminPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkHealth()
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeDatabase = async () => {
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`Database initialized with ${data.cases} demo cases!`)
        await checkHealth()
      } else {
        alert('Failed to initialize database')
      }
    } catch (error) {
      console.error('Database initialization failed:', error)
      alert('Database initialization failed')
    }
  }

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return
    }

    try {
      // We'll implement this endpoint
      alert('Database clear functionality not implemented in demo version')
    } catch (error) {
      console.error('Database clear failed:', error)
      alert('Database clear failed')
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading system status...</div>
  }

  return (
    <div className="container mx-auto px-4 md:px-6">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
        <p className="text-muted-foreground">
          Monitor system health and manage the application
        </p>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>System Health</span>
            <div className={`w-3 h-3 rounded-full ${
              health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </CardTitle>
          <CardDescription>Real-time system status monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className={`font-medium ${
                  health.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {health.status.toUpperCase()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Database</label>
                <div className={`font-medium ${
                  health.database === 'connected' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {health.database}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Cases</label>
                <div className="font-medium">{health.cases}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Environment</label>
                <div className="font-medium capitalize">{health.environment}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deployment</label>
                <div className="font-medium capitalize">{health.deployment}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Check</label>
                <div className="font-medium text-xs">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to load system health
            </div>
          )}
          
          <div className="mt-4 flex space-x-2">
            <Button size="sm" onClick={checkHealth}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <CardTitle>Database Management</CardTitle>
          <CardDescription>Initialize or manage the database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Initialize with Demo Data</div>
              <div className="text-sm text-muted-foreground">
                Populate the database with sample probate cases for testing
              </div>
            </div>
            <Button onClick={initializeDatabase}>
              Initialize
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Clear All Data</div>
              <div className="text-sm text-muted-foreground">
                Remove all cases, contacts, and parcels from the database
              </div>
            </div>
            <Button variant="destructive" onClick={clearDatabase}>
              Clear Database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vercel-Specific Information */}
      {health?.deployment === 'vercel' && (
        <Card>
          <CardHeader>
            <CardTitle>Vercel Deployment Notes</CardTitle>
            <CardDescription>Important information about this serverless deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm">
                <strong>⚠️ Ephemeral Database:</strong> The SQLite database resets on each deployment. 
                Data is not persistent across deployments.
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm">
                <strong>ℹ️ Demo Mode:</strong> Web scraping uses demo data instead of real websites 
                due to serverless limitations.
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm">
                <strong>✅ Full Features:</strong> For persistent data and real scraping, 
                use the Docker deployment: <code className="bg-gray-100 px-1 rounded">docker-compose up -d</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/cases'}
              className="justify-start"
            >
              📊 View All Cases
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/settings'}
              className="justify-start"
            >
              ⚙️ System Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/api/health'}
              className="justify-start"
            >
              🔍 Health Check API
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}