'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ScrapingButton() {
  const [isScraping, setIsScraping] = useState(false)

  const startScraping = async () => {
    setIsScraping(true)
    try {
      const response = await fetch('/api/scrape-playwright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sites: ['georgia_probate_records'],
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      })
      
      if (response.ok) {
        alert('Scraping job started successfully!')
        // Refresh the page to show updated data
        window.location.reload()
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

  return (
    <Button 
      onClick={startScraping} 
      disabled={isScraping}
    >
      {isScraping ? 'Running...' : 'Start Scraping'}
    </Button>
  )
}