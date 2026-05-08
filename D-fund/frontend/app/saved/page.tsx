'use client'

import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import OpportunityCard from '@/components/OpportunityCard'
import AuthGuard from '@/components/AuthGuard'
import type { Opportunity } from '@/app/lib/types'
import { Bookmark } from 'lucide-react'
import Link from 'next/link'

function SavedSkeleton() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function SavedPage() {
  const { user } = useAuth()

  const { data: savedOpportunities, isLoading } = useQuery({
    queryKey: ['saved-opportunities'],
    queryFn: () => apiJson('/social/saved'),
    enabled: !!user?.id,
  })

  return (
    <AuthGuard
      skeleton={<SavedSkeleton />}
      message="Connectez-vous pour voir vos opportunités sauvegardées."
    >
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-6 h-6 text-[#3b49df]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opportunités sauvegardées</h1>
            <p className="text-sm text-gray-500">
              Les opportunités que vous avez mises de côté
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : savedOpportunities?.length > 0 ? (
          <div className="space-y-4">
            {(savedOpportunities as Opportunity[]).map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-12 text-center">
            <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 text-lg mb-2">Aucune opportunité sauvegardée</p>
            <p className="text-gray-500 text-sm mb-6">
              Explorez les opportunités et sauvegardez celles qui vous intéressent.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-[#3b49df] text-white rounded-lg font-semibold hover:bg-[#2d3aba] transition-colors"
            >
              Explorer les opportunités
            </Link>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
