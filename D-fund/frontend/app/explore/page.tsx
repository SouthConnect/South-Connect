'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import Link from 'next/link'
import { Search, Briefcase, Users, Lightbulb, DollarSign, Calendar, Rocket, ArrowRight, MapPin } from 'lucide-react'
import OpportunityCard from '@/components/OpportunityCard'
import type { Opportunity } from '@/app/lib/types'

const CATEGORY_GROUPS = [
  {
    label: 'Emplois & Talents',
    icon: Briefcase,
    color: 'bg-blue-50 text-blue-600',
    types: ['JOB_OPPORTUNITY', 'TALENT_PROFILE'],
  },
  {
    label: 'Co-Fondateurs',
    icon: Users,
    color: 'bg-purple-50 text-purple-600',
    types: ['CO_FOUNDER_OPPORTUNITY', 'CO_FOUNDER_PROFILE'],
  },
  {
    label: 'Idées & Projets',
    icon: Lightbulb,
    color: 'bg-yellow-50 text-yellow-600',
    types: ['BUSINESS_IDEA', 'PROJECT_SEEKING_SUPPORT'],
  },
  {
    label: 'Financement',
    icon: DollarSign,
    color: 'bg-green-50 text-green-600',
    types: ['FUNDING_OPPORTUNITY', 'INVESTOR_THESIS', 'INVESTOR_PROFILE', 'DEAL_FLOW'],
  },
  {
    label: 'Événements & Programmes',
    icon: Calendar,
    color: 'bg-red-50 text-red-600',
    types: ['EVENT', 'CALL_FOR_STARTUPS', 'VENTURE_PROGRAM'],
  },
  {
    label: 'Services & Soutien',
    icon: Rocket,
    color: 'bg-orange-50 text-orange-600',
    types: ['SERVICE_LISTING', 'SERVICE_REQUEST', 'SUPPORT_OFFER', 'MENTORSHIP_BA_OFFER', 'MARKET_ADVISOR'],
  },
]

export default function ExplorePage() {
  const [activeGroup, setActiveGroup] = useState<number | null>(null)

  const typeFilter = activeGroup !== null
    ? CATEGORY_GROUPS[activeGroup].types.join(',')
    : ''

  const { data, isLoading } = useQuery<{ data: Opportunity[] }>({
    queryKey: ['explore', typeFilter],
    queryFn: () =>
      apiJson(`/opportunities?status=ACTIVE&take=12${typeFilter ? `&types=${encodeURIComponent(typeFilter)}` : ''}`),
  })

  const { data: profiles } = useQuery<any[]>({
    queryKey: ['explore-profiles'],
    queryFn: () => apiJson('/profiles/lists/members?take=6'),
    enabled: activeGroup === null,
  })

  const opportunities: Opportunity[] = data?.data ?? []

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a237e] to-[#3b49df] py-14 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold text-white mb-3">Explorer D-Fund</h1>
          <p className="text-white/70 mb-8 text-base">
            Découvrez des opportunités, talents, investisseurs et collaborateurs dans tout l'écosystème.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-white text-[#3b49df] font-semibold px-6 py-3 rounded-xl shadow hover:shadow-md transition-shadow text-sm"
          >
            <Search className="w-4 h-4" />
            Rechercher dans tout…
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setActiveGroup(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              activeGroup === null
                ? 'bg-[#3b49df] text-white border-[#3b49df]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
            }`}
          >
            Tout
          </button>
          {CATEGORY_GROUPS.map((g, i) => {
            const Icon = g.icon
            return (
              <button
                key={i}
                onClick={() => setActiveGroup(activeGroup === i ? null : i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  activeGroup === i
                    ? 'bg-[#3b49df] text-white border-[#3b49df]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {g.label}
              </button>
            )
          })}
        </div>

        {/* Opportunities grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              {activeGroup !== null ? CATEGORY_GROUPS[activeGroup].label : 'Dernières opportunités'}
            </h2>
            <Link
              href={activeGroup !== null ? `/?types=${encodeURIComponent(CATEGORY_GROUPS[activeGroup].types.join(','))}` : '/'}
              className="text-sm text-[#3b49df] font-semibold flex items-center gap-1 hover:underline"
            >
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Aucune opportunité dans cette catégorie pour l'instant.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          )}
        </section>

        {/* People section — only on "All" */}
        {activeGroup === null && (profiles?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Personnes sur D-Fund</h2>
              <Link href="/profiles" className="text-sm text-[#3b49df] font-semibold flex items-center gap-1 hover:underline">
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {profiles!.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/profiles/${p.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 hover:shadow-sm transition-shadow text-center"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-sm font-bold text-[#3b49df]">
                    {p.profilePic
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.profilePic} alt="" className="w-full h-full object-cover" />
                      : (p.name?.[0] || 'U')}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 truncate w-full max-w-[80px]">{p.name}</p>
                    {(p.city || p.country) && (
                      <p className="text-[10px] text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {p.city || p.country}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
