'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface CaseDetail {
  id: string
  caseId: string
  county: string
  filingDate: string
  decedentName: string
  decedentAddress?: string
  estateValue?: number
  caseNumber?: string
  attorney?: string
  attorneyPhone?: string
  courtUrl?: string
  status: string
  notes?: string
  contacts: Array<{
    id: string
    type: string
    name: string
    originalAddress?: string
    standardizedAddress?: string
    upsDeliverable: boolean
    phone?: string
    phoneSource?: string
    phoneConfidence?: number
  }>
  parcels: Array<{
    id: string
    parcelId: string
    county: string
    situsAddress?: string
    taxMailingAddress?: string
    currentOwner?: string
    lastSaleDate?: string
    assessedValue?: number
    legalDescription?: string
    qpublicUrl?: string
    matchConfidence: number
  }>
}

export default function CaseDetailPage() {
  const params = useParams()
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'active' | 'archived'>('active')

  useEffect(() => {
    if (params.id) {
      fetchCaseDetail()
    }
  }, [params.id])

  const fetchCaseDetail = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/cases/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setCaseDetail(data.data)
        setNotes(data.data.notes || '')
        setStatus(data.data.status)
      }
    } catch (error) {
      console.error('Error fetching case detail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/cases/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, status })
      })

      if (response.ok) {
        const data = await response.json()
        setCaseDetail(data.data)
        setIsEditing(false)
        alert('Case updated successfully!')
      } else {
        alert('Failed to update case')
      }
    } catch (error) {
      console.error('Error updating case:', error)
      alert('Error updating case')
    }
  }

  const exportCase = async (format: 'json' | 'csv') => {
    if (!caseDetail) return

    try {
      const response = await fetch('/api/cases/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          caseIds: [caseDetail.id]
        })
      })

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `case-${caseDetail.caseId}.csv`
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
        a.download = `case-${caseDetail.caseId}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting case:', error)
      alert('Export failed')
    }
  }

  const copyJSON = () => {
    if (!caseDetail) return

    const jsonOutput = {
      case_id: caseDetail.caseId,
      county: caseDetail.county,
      filing_date: caseDetail.filingDate,
      decedent: {
        name: caseDetail.decedentName,
        address: caseDetail.decedentAddress || ''
      },
      estate_value: caseDetail.estateValue,
      contacts: caseDetail.contacts.map(contact => ({
        type: contact.type,
        name: contact.name,
        original_address: contact.originalAddress || '',
        standardized_address: contact.standardizedAddress || '',
        ups_deliverable: contact.upsDeliverable,
        phone: contact.phone,
        phone_source: contact.phoneSource
      })),
      parcels: caseDetail.parcels.map(parcel => ({
        parcel_id: parcel.parcelId,
        county: parcel.county,
        situs_address: parcel.situsAddress || '',
        tax_mailing_address: parcel.taxMailingAddress || '',
        current_owner: parcel.currentOwner || '',
        last_sale_date: parcel.lastSaleDate,
        assessed_value: parcel.assessedValue,
        qpublic_url: parcel.qpublicUrl || ''
      }))
    }

    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2))
    alert('JSON copied to clipboard!')
  }

  const formatCurrency = (value?: number) => {
    return value ? new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value) : '-'
  }

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString('en-US') : '-'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading case details...</div>
  }

  if (!caseDetail) {
    return <div className="text-center py-8">Case not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Case {caseDetail.caseId}</h1>
          <p className="text-muted-foreground capitalize">
            {caseDetail.county} County • Filed {formatDate(caseDetail.filingDate)}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportCase('csv')}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportCase('json')}>
            Export JSON
          </Button>
          <Button onClick={copyJSON}>
            Copy JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Case Information */}
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Case Number</label>
                  <div className="font-medium">{caseDetail.caseNumber || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estate Value</label>
                  <div className="font-medium">{formatCurrency(caseDetail.estateValue)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Attorney</label>
                  <div className="font-medium">{caseDetail.attorney || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Attorney Phone</label>
                  <div className="font-medium">{caseDetail.attorneyPhone || '-'}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Decedent</label>
                <div className="font-medium">{caseDetail.decedentName}</div>
                {caseDetail.decedentAddress && (
                  <div className="text-sm text-muted-foreground">{caseDetail.decedentAddress}</div>
                )}
              </div>
              {caseDetail.courtUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Court URL</label>
                  <div>
                    <a 
                      href={caseDetail.courtUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Original Filing
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Contacts ({caseDetail.contacts.length})</CardTitle>
              <CardDescription>Executors, administrators, and petitioners</CardDescription>
            </CardHeader>
            <CardContent>
              {caseDetail.contacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No contacts found</p>
              ) : (
                <div className="space-y-4">
                  {caseDetail.contacts.map((contact) => (
                    <div key={contact.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">{contact.type}</div>
                        </div>
                        {contact.phone && (
                          <div className="text-right">
                            <div className="font-medium">{contact.phone}</div>
                            {contact.phoneSource && (
                              <div className="text-xs text-muted-foreground">
                                via {contact.phoneSource}
                                {contact.phoneConfidence && (
                                  <span className={`ml-1 ${getConfidenceColor(contact.phoneConfidence)}`}>
                                    ({Math.round(contact.phoneConfidence * 100)}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {contact.originalAddress && (
                        <div className="text-sm">
                          <div className="text-muted-foreground">Original Address:</div>
                          <div>{contact.originalAddress}</div>
                        </div>
                      )}
                      {contact.standardizedAddress && (
                        <div className="text-sm mt-1">
                          <div className="text-muted-foreground">Standardized Address:</div>
                          <div className="flex items-center space-x-2">
                            <span>{contact.standardizedAddress}</span>
                            {contact.upsDeliverable && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Deliverable
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Properties */}
          <Card>
            <CardHeader>
              <CardTitle>Properties ({caseDetail.parcels.length})</CardTitle>
              <CardDescription>Linked property records from QPublic</CardDescription>
            </CardHeader>
            <CardContent>
              {caseDetail.parcels.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No properties found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parcel ID</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseDetail.parcels.map((parcel) => (
                      <TableRow key={parcel.id}>
                        <TableCell className="font-mono text-xs">{parcel.parcelId}</TableCell>
                        <TableCell>
                          <div>{parcel.situsAddress || '-'}</div>
                          {parcel.taxMailingAddress && parcel.taxMailingAddress !== parcel.situsAddress && (
                            <div className="text-xs text-muted-foreground">
                              Tax: {parcel.taxMailingAddress}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{parcel.currentOwner || '-'}</div>
                          {parcel.lastSaleDate && (
                            <div className="text-xs text-muted-foreground">
                              Sale: {formatDate(parcel.lastSaleDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(parcel.assessedValue)}</TableCell>
                        <TableCell>
                          <span className={`text-sm ${getConfidenceColor(parcel.matchConfidence)}`}>
                            {Math.round(parcel.matchConfidence * 100)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {parcel.qpublicUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(parcel.qpublicUrl, '_blank')}
                            >
                              View QPublic
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Case Management */}
          <Card>
            <CardHeader>
              <CardTitle>Case Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background mt-1"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'archived')}
                  disabled={!isEditing}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 text-sm border border-input rounded-md bg-background mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add case notes..."
                  disabled={!isEditing}
                />
              </div>
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave}>Save Changes</Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false)
                        setNotes(caseDetail.notes || '')
                        setStatus(caseDetail.status as 'active' | 'archived')
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Case
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Contacts:</span>
                <span className="font-medium">{caseDetail.contacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">With Phone Numbers:</span>
                <span className="font-medium">
                  {caseDetail.contacts.filter(c => c.phone).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Properties:</span>
                <span className="font-medium">{caseDetail.parcels.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Property Value:</span>
                <span className="font-medium">
                  {formatCurrency(
                    caseDetail.parcels.reduce((sum, p) => sum + (p.assessedValue || 0), 0)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}