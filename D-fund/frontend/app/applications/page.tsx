'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { qk } from '@/app/lib/queryKeys'
import { stageLabel, stageColor } from '@/app/lib/stage-labels'
import { useAuth } from '@/app/lib/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import type { Application } from '@/app/lib/types'
import { Clock, CheckCircle, Archive, Filter, Search } from 'lucide-react'
import Link from 'next/link'

type StageFilter = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'OWNER_REVIEW' | 'SUCCESS' | 'ARCHIVED'

function AppsSkeleton() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  const { user } = useAuth()
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [search, setSearch] = useState('')

  const {
    data: applications,
    isLoading,
    isError,
    error,
  } = useQuery<Application[]>({
    queryKey: qk.myApplicationsFull(user?.id ?? ''),
    queryFn: () => apiJson<Application[]>(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  const filtered: Application[] =
    (applications ?? [])
      .filter((app) => {
        if (stageFilter !== 'ALL' && app.stage !== stageFilter) return false
        if (!search) return true
        const haystack = `${app.title || ''} ${app.opportunity?.name || ''}`.toLowerCase()
        return haystack.includes(search.toLowerCase())
      }) || []

  return (
    <AuthGuard skeleton={<AppsSkeleton />}>
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes Candidatures</h1>
            <p className="text-sm text-gray-500">
              Rédigez, soumettez et suivez vos candidatures aux opportunités SouthConnect.
            </p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-4 border-b border-gray-200 text-sm">
            {[
              { id: 'ALL', label: 'Toutes' },
              { id: 'DRAFT', label: 'Brouillon', icon: Clock },
              { id: 'SUBMITTED', label: 'Soumise' },
              { id: 'OWNER_REVIEW', label: 'En révision' },
              { id: 'SUCCESS', label: 'Acceptée', icon: CheckCircle },
              { id: 'ARCHIVED', label: 'Archivée', icon: Archive },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setStageFilter(id as StageFilter)}
                className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                  stageFilter === id
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une candidature"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-none text-sm focus:ring-2 focus:ring-[#3b49df]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filtres
            </button>
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(error as Error)?.message || 'Unable to load your applications.'}
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-50 animate-pulse" />
            ))
          ) : filtered.length ? (
            filtered.map((app) => <ApplicationRow key={app.id} app={app} />)
          ) : (
            <div className="py-12 text-center text-gray-500 text-sm">
              {stageFilter === 'ALL' && !search ? (
                <div className="space-y-3">
                  <p className="font-semibold text-gray-700">Aucune candidature pour l'instant</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Parcourez les opportunités et cliquez sur "Postuler" pour créer votre première candidature.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-[#3b49df] text-white text-xs font-semibold rounded-lg hover:bg-[#2d3aba] transition-colors"
                  >
                    Explorer les opportunités
                  </Link>
                </div>
              ) : (
                'Aucune candidature ne correspond à vos filtres.'
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

function ApplicationRow({ app }: { app: Application }) {
  const chipClass = stageColor(app.stage)
  const isDraft = app.stage === 'DRAFT'

  return (
    <Link
      href={`/applications/${app.id}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${chipClass}`}>
            {stageLabel(app.stage)}
          </span>
          <span className="text-xs text-gray-400">
            {app.submissionDate
              ? new Date(app.submissionDate).toLocaleDateString('fr-FR')
              : 'Pas encore soumise'}
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-900 truncate">
          {app.opportunity?.name || 'Opportunité sans titre'}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {app.title || (isDraft ? 'Pas encore de titre — cliquez pour compléter' : 'Sans titre')}
        </div>
      </div>
      <span className={`ml-4 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
        isDraft
          ? 'bg-[#3b49df] text-white group-hover:bg-[#2d3aba]'
          : 'border border-gray-200 text-gray-600 group-hover:bg-gray-100'
      }`}>
        {isDraft ? 'Compléter →' : 'Voir'}
      </span>
    </Link>
  )
}
