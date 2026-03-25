'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { Filter, Plus, Clock, CheckCircle, Archive } from 'lucide-react'
import OpportunityCard from '@/components/OpportunityCard'

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'CLOSED'

export default function MyOpportunitiesPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const {
    data: opportunities,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['my-opportunities', user?.id],
    queryFn: () => apiJson(`/opportunities/user/${user?.id}?take=50`),
    enabled: !!user?.id,
  })

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            Please sign in to view and manage your opportunities.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-[#3b49df] text-white rounded-lg font-semibold hover:bg-[#2d3aba] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const filtered =
    opportunities?.filter((op: any) => {
      if (statusFilter === 'ALL') return true
      return op.status === statusFilter
    }) || []

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Opportunities</h1>
          <p className="text-sm text-gray-500">
            Manage the opportunities you have created on D-fund.
          </p>
        </div>
        <Link
          href="/opportunities/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create opportunity
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-4 border-b border-gray-200 text-sm">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'DRAFT', label: 'Draft', icon: Clock },
            { id: 'ACTIVE', label: 'Active', icon: CheckCircle },
            { id: 'ARCHIVED', label: 'Archived', icon: Archive },
            { id: 'CLOSED', label: 'Closed' },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id as StatusFilter)}
              className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                statusFilter === id
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
            </button>
          ))}
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error)?.message || 'Unable to load your opportunities.'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((opportunity: any) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-500">
          {statusFilter === 'ALL'
            ? 'You have not created any opportunities yet.'
            : 'No opportunities match the selected status.'}
        </div>
      )}
    </div>
  )
}

