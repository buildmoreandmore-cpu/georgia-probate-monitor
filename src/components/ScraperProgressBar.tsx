'use client'

import { useState, useEffect } from 'react'

interface ScraperProgress {
  isRunning: boolean
  progress: number
  currentTask: string
  totalSites: number
  completedSites: number
  startTime: string | null
  errors: string[]
}

interface ScraperProgressBarProps {
  isVisible: boolean
  onComplete?: () => void
}

export default function ScraperProgressBar({ isVisible, onComplete }: ScraperProgressBarProps) {
  const [progress, setProgress] = useState<ScraperProgress>({
    isRunning: false,
    progress: 0,
    currentTask: 'Idle',
    totalSites: 9,
    completedSites: 0,
    startTime: null,
    errors: []
  })

  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const pollProgress = async () => {
      try {
        const response = await fetch('/api/scraper-progress')
        const data = await response.json()
        setProgress(data)
        
        // If scraping completed
        if (!data.isRunning && data.progress === 100 && progress.isRunning) {
          setIsAnimating(true)
          setTimeout(() => {
            onComplete?.()
            setIsAnimating(false)
          }, 2000) // Show completion for 2 seconds
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error)
      }
    }

    // Poll every 1 second while visible
    const interval = setInterval(pollProgress, 1000)
    
    // Initial fetch
    pollProgress()

    return () => clearInterval(interval)
  }, [isVisible, onComplete, progress.isRunning])

  if (!isVisible && !progress.isRunning) return null

  const getElapsedTime = () => {
    if (!progress.startTime) return ''
    const elapsed = Date.now() - new Date(progress.startTime).getTime()
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const getProgressColor = () => {
    if (progress.errors.length > 0) return 'bg-red-500'
    if (progress.progress === 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getProgressText = () => {
    if (progress.errors.length > 0) return 'Error occurred'
    if (progress.progress === 100) return 'Completed!'
    return `${Math.round(progress.progress)}%`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className={`w-8 h-8 text-blue-500 ${progress.isRunning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {progress.isRunning ? 'Scraping in Progress' : 'Scraping Complete'}
          </h3>
          <p className="text-sm text-gray-600">
            {progress.currentTask}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className={`text-sm font-bold ${isAnimating ? 'text-green-600' : 'text-gray-900'}`}>
              {getProgressText()}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full ${getProgressColor()} transition-all duration-500 ease-out ${isAnimating ? 'animate-pulse' : ''}`}
              style={{ width: `${Math.max(progress.progress, 0)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="font-semibold text-gray-900">{progress.completedSites}</div>
            <div className="text-gray-600">of {progress.totalSites} sites</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="font-semibold text-gray-900">{getElapsedTime()}</div>
            <div className="text-gray-600">elapsed</div>
          </div>
        </div>

        {/* Errors */}
        {progress.errors.length > 0 && (
          <div className="mb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Recent Issues:</h4>
              {progress.errors.slice(-2).map((error, index) => (
                <p key={index} className="text-xs text-red-600 mb-1">{error}</p>
              ))}
            </div>
          </div>
        )}

        {/* Close Button (only show when completed) */}
        {!progress.isRunning && progress.progress === 100 && (
          <button
            onClick={() => onComplete?.()}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            View Results
          </button>
        )}
        
        {/* Sites being scraped indicator */}
        {progress.isRunning && (
          <div className="text-xs text-gray-500 text-center">
            Scraping probate courts and property records...
          </div>
        )}
      </div>
    </div>
  )
}