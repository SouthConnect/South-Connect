'use client'

import { useState } from 'react'
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson } from '@/app/lib/api'
import { useDebounce } from '@/app/hooks/useDebounce'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'
import { Search, Filter, Loader2 } from 'lucide-react'

// DRAFT intentionally excluded — drafts are never shown in the public feed
const STATUS_OPTIONS = ['ACTIVE', 'PENDING', 'CLOSED', 'ARCHIVED'] as const

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING: 'En attente',
  CLOSED: 'Fermée',
  ARCHIVED: 'Archivée',
}

const TYPE_LABELS: Record<string, string> = {
  JOB_OPPORTUNITY: 'Emploi',
  TALENT_PROFILE: 'Talent',
  CO_FOUNDER_OPPORTUNITY: 'Co-Fondateur',
  CO_FOUNDER_PROFILE: 'Profil Co-Fondateur',
  BUSINESS_IDEA: 'Idée de Business',
  SUPPORT_OFFER: 'Offre de Support',
  SERVICE_LISTING: 'Service',
  SERVICE_REQUEST: 'Demande de Service',
  DEAL_FLOW: 'Deal Flow',
  INVESTOR_THESIS: 'Thèse Investisseur',
  INVESTOR_PROFILE: 'Investisseur',
  FUNDING_OPPORTUNITY: 'Financement',
  EVENT: 'Événement',
  CALL_FOR_STARTUPS: 'Appel à Startups',
  MENTORSHIP_BA_OFFER: 'Mentorat',
  PROJECT_SEEKING_SUPPORT: 'Projet en Recherche',
  VENTURE_PROGRAM: 'Programme Venture',
  CHILL_WORK_SPOT: 'Espace de Travail',
  MARKET_ADVISOR: 'Conseiller Marché',
}

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
  const debouncedSearch = useDebounce(search, 350)

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: qk.opportunitiesAdmin(debouncedSearch, status, type),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      params.set('take', '20')
      if (pageParam) params.set('cursor', pageParam as string)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (status) params.set('status', status)
      if (type) params.set('type', type)
      return apiJson(`/opportunities?${params.toString()}`)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })

  const opportunities = data?.pages.flatMap((p: any) => p.data) ?? []
  const total = data?.pages[0]?.total

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-6">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Explorer les opportunités</h1>
            <p className="text-sm text-gray-500">
              Parcourez et filtrez toutes les opportunités créées par la communauté.
            </p>
          </div>
          <Link
            href="/opportunities/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
          >
            Créer une opportunité
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
                placeholder="Rechercher par titre, accroche ou description"
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
                  <option value="">Tous les types</option>
                  {TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {TYPE_LABELS[value] ?? value.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3b49df]"
              >
                <option value="">Tous les statuts</option>
                {STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value] ?? value}
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
            {(error as Error)?.message || 'Impossible de charger les opportunités.'}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {opportunities.length === 0 ? (
              <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="mb-4">
                  Aucune opportunité ne correspond à vos filtres.
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
                  Réinitialiser les filtres
                </button>
                <Link
                  href="/opportunities/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
                >
                  Créer une opportunité
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {total !== undefined && (
                  <p className="text-xs text-gray-400 mb-2">{total} résultat{total !== 1 ? 's' : ''}</p>
                )}
                {opportunities.map((opportunity: any) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}

                {hasNextPage && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {isFetchingNextPage ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                      ) : (
                        'Voir plus'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
