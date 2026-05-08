'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'

// DRAFT intentionally excluded — drafts are never shown in the public feed
const STATUS_OPTIONS = ['ACTIVE', 'PENDING', 'CLOSED', 'ARCHIVED'] as const

const TYPE_OPTIONS = [
  'JOB_OPPORTUNITY',
  'TALENT_PROFILE',
  'CO_FOUNDER_OPPORTUNITY',
  'CO_FOUNDER_PROFILE',
  'BUSINESS_IDEA',
  'SUPPORT_OFFER',
  'SERVICE_LISTING',
  'SERVICE_REQUEST',
  'DEAL_FLOW',
  'INVESTOR_THESIS',
  'INVESTOR_PROFILE',
  'FUNDING_OPPORTUNITY',
  'EVENT',
  'CALL_FOR_STARTUPS',
  'MENTORSHIP_BA_OFFER',
  'PROJECT_SEEKING_SUPPORT',
  'VENTURE_PROGRAM',
  'CHILL_WORK_SPOT',
  'MARKET_ADVISOR',
] as const

type StatusFilter = (typeof STATUS_OPTIONS)[number] | ''
type TypeFilter = (typeof TYPE_OPTIONS)[number] | ''

export default function OpportunitiesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [type, setType] = useState<TypeFilter>('')

  const {
    data: opportunities,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['opportunities', { search, status, type }],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('take', '50')

      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (type) params.set('type', type)

      const qs = params.toString()
      const endpoint = qs ? `/opportunities?${qs}` : '/opportunities'
      return apiJson(endpoint)
    },
  })

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-6">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Explore opportunities</h1>
            <p className="text-sm text-gray-500">
              Browse and filter all opportunities created by the community.
            </p>
          </div>
          <Link
            href="/opportunities/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
          >
            Create opportunity
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, punchline or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b49df] focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TypeFilter)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3b49df]"
                >
                  <option value="">All types</option>
                  {TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3b49df]"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(error as Error)?.message || 'Unable to load opportunities.'}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {!opportunities?.data || opportunities.data.length === 0 ? (
              <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="mb-4">
                  No opportunities match your current filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                    setType('')
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors mr-3"
                >
                  Reset filters
                </button>
                <Link
                  href="/opportunities/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
                >
                  Create a new opportunity
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.total !== undefined && (
                  <p className="text-xs text-gray-400 mb-2">{opportunities.total} result{opportunities.total !== 1 ? 's' : ''}</p>
                )}
                {opportunities.data.map((opportunity: any) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
