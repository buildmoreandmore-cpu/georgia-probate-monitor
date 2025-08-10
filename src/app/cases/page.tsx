import { Suspense } from 'react'
import { listCases } from '@/services/cases'
import { CasesTable } from '@/components/cases-table'

interface SearchParams {
  county?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
}

interface CasesPageProps {
  searchParams: SearchParams
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const {
    county,
    status,
    dateFrom,
    dateTo,
    page = '1',
    limit = '20'
  } = searchParams

  // Fetch data directly on server - no client-side fetching
  const result = await listCases({
    county,
    status,
    dateFrom,
    dateTo,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  })

  return (
    <Suspense fallback={
      <div className="flex justify-center py-8">
        Loading cases...
      </div>
    }>
      <CasesTable 
        cases={result.data}
        pagination={result.pagination}
      />
    </Suspense>
  )
}