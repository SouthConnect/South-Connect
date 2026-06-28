'use client'

import { type ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import { stageLabel, stageColor } from '@/app/lib/stage-labels'
import Link from 'next/link'
import type { Application, Opportunity } from '@/app/lib/types'
import {
  TrendingUp,
  Briefcase,
  Send,
  CheckCircle,
  Clock,
  Archive,
  Bookmark,
} from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: number | string
  icon: ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()

  const { data: myApps } = useQuery<Application[]>({
    queryKey: ['analytics-my-apps', user?.id],
    queryFn: () => apiJson<Application[]>(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  const { data: myOpps } = useQuery<Opportunity[]>({
    queryKey: ['analytics-my-opps', user?.id],
    queryFn: () => apiJson<Opportunity[]>(`/opportunities/user/${user?.id}?take=100`),
    enabled: !!user?.id,
  })

  const { data: savedOpps } = useQuery<Opportunity[]>({
    queryKey: ['analytics-saved', user?.id],
    queryFn: () => apiJson<Opportunity[]>('/social/saved'),
    enabled: !!user?.id,
  })

  const totalSent = myApps?.length ?? 0
  const submitted = myApps?.filter((a) => a.stage === 'SUBMITTED').length ?? 0
  const inReview = myApps?.filter((a) => a.stage === 'OWNER_REVIEW').length ?? 0
  const accepted = myApps?.filter((a) => a.stage === 'SUCCESS').length ?? 0
  const archived = myApps?.filter((a) => a.stage === 'ARCHIVED').length ?? 0

  const totalOpps = myOpps?.length ?? 0
  const activeOpps = myOpps?.filter((o) => o.status === 'ACTIVE').length ?? 0
  const totalSaved = savedOpps?.length ?? 0

  const recentApps: Application[] = myApps?.slice(0, 5) ?? []

  return (
    <AuthGuard message="Please sign in to view your analytics.">
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-6 h-6 text-[#3b49df]" />
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          </div>
          <p className="text-sm text-gray-500">Vue d'ensemble de ton activité sur SouthConnect.</p>
        </div>

        {/* Applications stats */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Mes candidatures</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Envoyées" value={totalSent} icon={Send} color="bg-blue-50 text-blue-600" />
            <StatCard label="En attente" value={submitted} icon={Clock} color="bg-yellow-50 text-yellow-600" />
            <StatCard label="En review" value={inReview} icon={Clock} color="bg-purple-50 text-purple-600" />
            <StatCard label="Acceptées" value={accepted} icon={CheckCircle} color="bg-green-50 text-green-600" />
          </div>
        </div>

        {/* Opportunities & social */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Mes opportunités & activité</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Opportunités créées"
              value={totalOpps}
              icon={Briefcase}
              color="bg-indigo-50 text-indigo-600"
              sub={activeOpps > 0 ? `${activeOpps} actives` : undefined}
            />
            <StatCard label="Sauvegardées" value={totalSaved} icon={Bookmark} color="bg-orange-50 text-orange-600" />
            <StatCard label="Archivées" value={archived} icon={Archive} color="bg-gray-100 text-gray-500" />
            <StatCard
              label="Taux d'acceptation"
              value={totalSent > 0 ? `${Math.round((accepted / totalSent) * 100)}%` : '—'}
              icon={TrendingUp}
              color="bg-green-50 text-green-600"
            />
          </div>
        </div>

        {/* Conversion funnel */}
        {totalSent > 0 && (
          <div className="mb-8 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Funnel de candidature</h2>
            <div className="space-y-3">
              {[
                { label: 'Soumises', count: submitted, color: 'bg-blue-400' },
                { label: 'En review', count: inReview, color: 'bg-purple-400' },
                { label: 'Acceptées', count: accepted, color: 'bg-green-400' },
                { label: 'Archivées', count: archived, color: 'bg-gray-300' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-500 shrink-0">{label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${color} h-2 rounded-full transition-all`}
                      style={{ width: `${totalSent > 0 ? Math.round((count / totalSent) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs text-gray-600 text-right shrink-0">
                    {count}/{totalSent}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent applications */}
        {recentApps.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Candidatures récentes</h2>
              <Link href="/applications" className="text-xs text-[#3b49df] hover:underline font-semibold">
                Voir tout
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {recentApps.map((app) => (
                <li key={app.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {app.opportunity?.name || 'Opportunité'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${stageColor(app.stage)}`}>
                    {stageLabel(app.stage)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {totalSent === 0 && totalOpps === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-500">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600 mb-1">Pas encore d'activité</p>
            <p className="mb-4">Explore les opportunités et candidate pour voir tes stats ici.</p>
            <Link href="/" className="inline-block px-5 py-2 bg-[#3b49df] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3aba]">
              Explorer
            </Link>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
