'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Settings {
  address_provider: 'free' | 'ups' | 'usps'
  phone_provider: 'csv' | 'truecaller' | 'whitepages'
  rate_limit_rpm: string
  scrape_delay_ms: string
  enabled_counties: string
  cron_schedule: string
}

interface PhoneUpload {
  id: string
  filename: string
  records: number
  uploadedAt: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    address_provider: 'free',
    phone_provider: 'csv',
    rate_limit_rpm: '60',
    scrape_delay_ms: '2000',
    enabled_counties: 'cobb,dekalb,fulton',
    cron_schedule: '0 6 * * *'
  })
  const [phoneUploads, setPhoneUploads] = useState<PhoneUpload[]>([])
  const [currentDataSize, setCurrentDataSize] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchPhoneUploads()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      
      if (response.ok) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const fetchPhoneUploads = async () => {
    try {
      const response = await fetch('/api/phone/upload')
      const data = await response.json()
      
      if (response.ok) {
        setPhoneUploads(data.uploads || [])
        setCurrentDataSize(data.currentDataSize || 0)
      }
    } catch (error) {
      console.error('Error fetching phone uploads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Settings saved successfully!')
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/phone/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully uploaded ${data.recordsLoaded} phone records!`)
        await fetchPhoneUploads()
      } else {
        alert(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Upload failed')
    } finally {
      setIsUploading(false)
      // Reset the file input
      event.target.value = ''
    }
  }

  const handleInputChange = (key: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure scraping behavior and service providers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Service Providers</CardTitle>
            <CardDescription>Configure third-party service integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Address Standardization Provider</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background mt-1"
                value={settings.address_provider}
                onChange={(e) => handleInputChange('address_provider', e.target.value)}
              >
                <option value="free">Free (Regex Normalization)</option>
                <option value="ups">UPS Address Validation</option>
                <option value="usps">USPS Address Validation</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Free provider uses basic regex patterns. Paid providers require API credentials in .env
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Phone Enrichment Provider</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background mt-1"
                value={settings.phone_provider}
                onChange={(e) => handleInputChange('phone_provider', e.target.value)}
              >
                <option value="csv">CSV Upload Only</option>
                <option value="truecaller">TrueCaller API</option>
                <option value="whitepages">WhitePages API</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                CSV provider uses uploaded data only. API providers require credentials in .env
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Scraping Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Scraping Configuration</CardTitle>
            <CardDescription>Control scraping behavior and timing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rate Limit (requests per minute)</label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={settings.rate_limit_rpm}
                onChange={(e) => handleInputChange('rate_limit_rpm', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Scrape Delay (milliseconds)</label>
              <Input
                type="number"
                min="500"
                max="10000"
                value={settings.scrape_delay_ms}
                onChange={(e) => handleInputChange('scrape_delay_ms', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delay between requests to avoid overloading target sites
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Enabled Counties</label>
              <Input
                value={settings.enabled_counties}
                onChange={(e) => handleInputChange('enabled_counties', e.target.value)}
                placeholder="cobb,dekalb,fulton"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of counties to monitor
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Cron Schedule</label>
              <Input
                value={settings.cron_schedule}
                onChange={(e) => handleInputChange('cron_schedule', e.target.value)}
                placeholder="0 6 * * *"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Schedule for automatic scraping (cron format). Default: daily at 6 AM
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Phone Data Upload */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Phone Data Upload</CardTitle>
            <CardDescription>
              Upload CSV files containing name and phone number mappings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
              {isUploading && (
                <div className="text-sm text-muted-foreground">Uploading...</div>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2"><strong>CSV Format:</strong> name,phone,address (address column optional)</p>
              <p className="mb-2">Example: "John Doe","(555) 123-4567","123 Main St, Atlanta, GA"</p>
              <p>Current database contains <strong>{currentDataSize}</strong> phone records</p>
            </div>

            {phoneUploads.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Uploads</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {phoneUploads.map((upload) => (
                    <div key={upload.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="text-sm font-medium">{upload.filename}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(upload.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {upload.records} records
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}