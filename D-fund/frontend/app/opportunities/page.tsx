'use client'

import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'

export default function OpportunitiesPage() {
  const { data: opportunities, isLoading, isError, error } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => apiJson('/opportunities'),
  })

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-8">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Explore opportunities</h1>
            <p className="text-sm text-gray-500">
              Browse all opportunities created by the community.
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
            {(!opportunities || opportunities.length === 0) ? (
              <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="mb-4">No opportunities yet.</p>
                <Link
                  href="/opportunities/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
                >
                  Create the first opportunity
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map((opportunity: any) => (
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

