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
    status: searchParams.get('status') || 'active',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    estateValueMin: searchParams.get('estateValueMin') || '',
    estateValueMax: searchParams.get('estateValueMax') || ''
  })

  const updateURL = (newFilters: typeof filters, newPage: number = 1) => {
    const params = new URLSearchParams()
    if (newFilters.county) params.set('county', newFilters.county)
    if (newFilters.status) params.set('status', newFilters.status)
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
    if (newFilters.estateValueMin) params.set('estateValueMin', newFilters.estateValueMin)
    if (newFilters.estateValueMax) params.set('estateValueMax', newFilters.estateValueMax)
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <div>
              <label className="text-sm font-medium">Min Estate Value</label>
              <Input
                type="number"
                placeholder="e.g. 100000"
                value={filters.estateValueMin}
                onChange={(e) => handleFilterChange('estateValueMin', e.target.value)}
                disabled={isPending}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Estate Value</label>
              <Input
                type="number"
                placeholder="e.g. 1000000"
                value={filters.estateValueMax}
                onChange={(e) => handleFilterChange('estateValueMax', e.target.value)}
                disabled={isPending}
              />
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
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
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
                        County <SortIcon />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground">
                        Case Number <SortIcon />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground">
                        File Date <SortIcon />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground">
                        Petitioner Name <SortIcon />
                      </TableHead>
                      <TableHead>Petitioner Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Zip</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground">
                        Decedent Name <SortIcon />
                      </TableHead>
                      <TableHead>Decedent Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Zip</TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground">
                        Estate Value <SortIcon />
                      </TableHead>
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
                        <TableCell className="capitalize font-medium">{case_.county}</TableCell>
                        <TableCell>{case_.caseNumber || '-'}</TableCell>
                        <TableCell>{formatDate(case_.filingDate)}</TableCell>
                        <TableCell className="font-medium">
                          {case_.petitionerFirstName && case_.petitionerLastName 
                            ? `${case_.petitionerFirstName} ${case_.petitionerLastName}` 
                            : '-'}
                        </TableCell>
                        <TableCell>{case_.petitionerAddress || '-'}</TableCell>
                        <TableCell>{case_.petitionerCity || '-'}</TableCell>
                        <TableCell>{case_.petitionerState || '-'}</TableCell>
                        <TableCell>{case_.petitionerZipcode || '-'}</TableCell>
                        <TableCell>
                          {case_.petitionerPhone ? (
                            <a 
                              href={`tel:${case_.petitionerPhone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {case_.petitionerPhone}
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {case_.petitionerEmail ? (
                            <a 
                              href={`mailto:${case_.petitionerEmail}`}
                              className="text-blue-600 hover:underline"
                            >
                              {case_.petitionerEmail}
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{case_.decedentName}</TableCell>
                        <TableCell>{case_.decedentAddress || '-'}</TableCell>
                        <TableCell>{case_.decedentCity || '-'}</TableCell>
                        <TableCell>{case_.decedentState || '-'}</TableCell>
                        <TableCell>{case_.decedentZipcode || '-'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(case_.estateValue)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => router.push(`/cases/${case_.id}`)}
                            >
                              Details
                            </Button>
                            {case_.decedentAddress && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const address = `${case_.decedentAddress}, ${case_.decedentCity}, ${case_.decedentState} ${case_.decedentZipcode}`.replace(/undefined|null/g, '').replace(/,\s*,/g, ',').trim()
                                  window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank')
                                }}
                              >
                                Map
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {cases.map((case_) => (
                  <Card key={case_.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-lg capitalize">{case_.county} County</div>
                          <div className="text-sm text-muted-foreground">{case_.caseNumber || 'No case number'}</div>
                          <div className="text-sm text-muted-foreground">Filed: {formatDate(case_.filingDate)}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCases.includes(case_.id)}
                            onChange={() => handleSelectCase(case_.id)}
                          />
                          <div className="font-bold text-green-600">
                            {formatCurrency(case_.estateValue)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="font-medium text-blue-700 mb-2">Petitioner (Outreach Contact)</div>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">
                              {case_.petitionerFirstName && case_.petitionerLastName 
                                ? `${case_.petitionerFirstName} ${case_.petitionerLastName}` 
                                : 'No name available'}
                            </div>
                            <div>{case_.petitionerAddress || 'No address'}</div>
                            <div>{case_.petitionerCity && case_.petitionerState && case_.petitionerZipcode 
                              ? `${case_.petitionerCity}, ${case_.petitionerState} ${case_.petitionerZipcode}`
                              : 'No city/state/zip'}</div>
                            {case_.petitionerPhone && (
                              <div>
                                <a 
                                  href={`tel:${case_.petitionerPhone}`}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  📞 {case_.petitionerPhone}
                                </a>
                              </div>
                            )}
                            {case_.petitionerEmail && (
                              <div>
                                <a 
                                  href={`mailto:${case_.petitionerEmail}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  ✉️ {case_.petitionerEmail}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <div className="font-medium text-gray-700 mb-2">Property Information</div>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">{case_.decedentName}</div>
                            <div>{case_.decedentAddress || 'No address'}</div>
                            <div>{case_.decedentCity && case_.decedentState && case_.decedentZipcode 
                              ? `${case_.decedentCity}, ${case_.decedentState} ${case_.decedentZipcode}`
                              : 'No city/state/zip'}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          {case_.contacts.length} contacts • {case_.parcels.length} properties
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/cases/${case_.id}`)}
                          >
                            Details
                          </Button>
                          {case_.decedentAddress && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const address = `${case_.decedentAddress}, ${case_.decedentCity}, ${case_.decedentState} ${case_.decedentZipcode}`.replace(/undefined|null/g, '').replace(/,\s*,/g, ',').trim()
                                window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank')
                              }}
                            >
                              🗺️ Map
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

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