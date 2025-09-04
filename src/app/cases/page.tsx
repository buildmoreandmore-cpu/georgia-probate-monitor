import { Suspense } from 'react'
import { listCases } from '@/services/cases'
import { CasesTable } from '@/components/cases-table'
import { SearchParamsSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CasesPageProps {
  searchParams: {
    county?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    estateValueMin?: string
    estateValueMax?: string
    page?: string
  }
}

async function CasesContent({ searchParams }: CasesPageProps) {
  const validatedParams = SearchParamsSchema.parse(searchParams)
  
  const { data: cases, pagination } = await listCases({
    county: validatedParams.county,
    status: validatedParams.status || 'active',
    dateFrom: validatedParams.dateFrom,
    dateTo: validatedParams.dateTo,
    estateValueMin: validatedParams.estateValueMin ? Number(validatedParams.estateValueMin) : undefined,
    estateValueMax: validatedParams.estateValueMax ? Number(validatedParams.estateValueMax) : undefined,
    page: validatedParams.page ? Number(validatedParams.page) : 1,
    limit: 20
  })

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <CasesTable cases={cases} pagination={pagination} />
    </div>
  )
}

export default function CasesPage({ searchParams }: CasesPageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading cases...</div>
        </div>
      </div>
    }>
      <CasesContent searchParams={searchParams} />
    </Suspense>
  )
}