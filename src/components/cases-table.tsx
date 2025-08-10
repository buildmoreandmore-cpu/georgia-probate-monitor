'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CaseData } from '@/services/cases'

interface CasesTableProps {
  cases: CaseData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function CasesTable({ cases, pagination }: CasesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [selectedCases, setSelectedCases] = useState<string[]>([])
  const [filters, setFilters] = useState({
    county: searchParams.get('county') || '',
    status: searchParams.get('status') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || ''
  })

  const updateURL = (newFilters: typeof filters, newPage: number = 1) => {
    const params = new URLSearchParams()
    if (newFilters.county) params.set('county', newFilters.county)
    if (newFilters.status) params.set('status', newFilters.status)
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
    if (newPage > 1) params.set('page', newPage.toString())
    
    startTransition(() => {
      router.push(`/cases?${params.toString()}`)
    })
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    updateURL(newFilters, 1)
  }

  const handlePageChange = (newPage: number) => {
    updateURL(filters, newPage)
  }

  const handleSelectCase = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCases.length === cases.length) {
      setSelectedCases([])
    } else {
      setSelectedCases(cases.map(c => c.id))
    }
  }

  const exportSelected = async (format: 'json' | 'csv') => {
    if (selectedCases.length === 0) {
      alert('Please select cases to export')
      return
    }

    try {
      const response = await fetch('/api/cases/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          caseIds: selectedCases
        })
      })

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `probate-cases-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `probate-cases-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      alert(`Exported ${selectedCases.length} cases successfully!`)
    } catch (error) {
      console.error('Error exporting cases:', error)
      alert('Export failed')
    }
  }

  const formatCurrency = (value?: number) => {
    return value ? new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value) : '-'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US')
  }

  const SortIcon = () => <span className="ml-1">↕</span>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Probate Cases</h1>
          <p className="text-muted-foreground">
            Browse and manage probate filing records
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => exportSelected('csv')}
            disabled={selectedCases.length === 0}
          >
            Export CSV
          </Button>
          <Button 
            onClick={() => exportSelected('json')}
            disabled={selectedCases.length === 0}
          >
            Export JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter cases by county, status, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">County</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background"
                value={filters.county}
                onChange={(e) => handleFilterChange('county', e.target.value)}
                disabled={isPending}
              >
                <option value="">All Counties</option>
                <option value="cobb">Cobb</option>
                <option value="dekalb">DeKalb</option>
                <option value="fulton">Fulton</option>
                <option value="fayette">Fayette</option>
                <option value="newton">Newton</option>
                <option value="douglas">Douglas</option>
                <option value="gwinnett">Gwinnett</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                disabled={isPending}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                disabled={isPending}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cases ({pagination.total})</CardTitle>
          {selectedCases.length > 0 && (
            <CardDescription>
              {selectedCases.length} cases selected
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex justify-center py-8">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cases found. Try adjusting your filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <input
                        type="checkbox"
                        checked={selectedCases.length === cases.length}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-foreground">
                      Case ID <SortIcon />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-foreground">
                      County <SortIcon />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-foreground">
                      Filing Date <SortIcon />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-foreground">
                      Decedent <SortIcon />
                    </TableHead>
                    <TableHead>Estate Value</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((case_) => (
                    <TableRow key={case_.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCases.includes(case_.id)}
                          onChange={() => handleSelectCase(case_.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{case_.caseId}</TableCell>
                      <TableCell className="capitalize">{case_.county}</TableCell>
                      <TableCell>{formatDate(case_.filingDate)}</TableCell>
                      <TableCell>{case_.decedentName}</TableCell>
                      <TableCell>{formatCurrency(case_.estateValue)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {case_.contacts.length} contact{case_.contacts.length !== 1 ? 's' : ''}
                          {case_.contacts.some(c => c.phone) && (
                            <div className="text-xs text-green-600">
                              ✓ Phone numbers
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {case_.parcels.length} propert{case_.parcels.length !== 1 ? 'ies' : 'y'}
                          {case_.parcels.some(p => p.assessedValue) && (
                            <div className="text-xs text-muted-foreground">
                              Total: {formatCurrency(
                                case_.parcels.reduce((sum, p) => sum + (p.assessedValue || 0), 0)
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/cases/${case_.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} cases
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || isPending}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages || isPending}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}