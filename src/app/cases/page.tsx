import { Suspense } from 'react'
import { z } from 'zod'
import { listCases } from '@/services/cases'
import { CasesTable } from '@/components/cases-table'

// Force dynamic rendering - page queries database
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SearchParamsSchema = z.object({
  county: z.string().max(32).optional(),
  status: z.enum(['active', 'archived']).optional(),
  dateFrom: z.string().max(32).optional(),
  dateTo: z.string().max(32).optional(),
  page: z.coerce.number().int().min(1).max(50).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(20)
})

interface CasesPageProps {
  searchParams?: Record<string, string | string[]>
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const parsed = SearchParamsSchema.safeParse({
    county: typeof searchParams?.county === 'string' ? searchParams.county : undefined,
    status: typeof searchParams?.status === 'string' ? searchParams.status : undefined,
    dateFrom: typeof searchParams?.dateFrom === 'string' ? searchParams.dateFrom : undefined,
    dateTo: typeof searchParams?.dateTo === 'string' ? searchParams.dateTo : undefined,
    page: typeof searchParams?.page === 'string' ? searchParams.page : undefined,
    limit: typeof searchParams?.limit === 'string' ? searchParams.limit : undefined
  })

  if (!parsed.success) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Invalid query parameters</p>
      </div>
    )
  }

  const { county, status, dateFrom, dateTo, page, limit } = parsed.data

  // Fetch data directly on server - no client-side fetching
  const result = await listCases({
    county,
    status,
    dateFrom,
    dateTo,
    page,
    limit
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