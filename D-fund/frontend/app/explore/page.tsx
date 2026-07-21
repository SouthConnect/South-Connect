'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import Link from 'next/link'
import {
  Search, Briefcase, Users, Lightbulb, DollarSign, Calendar, Rocket,
  ArrowRight, MapPin, Wifi, X, ChevronDown,
} from 'lucide-react'
import OpportunityCard from '@/components/OpportunityCard'
import { Avatar } from '@/components/Avatar'
import type { Opportunity } from '@/app/lib/types'

// ── Catégories ────────────────────────────────────────────────────────────────

const CATEGORY_GROUPS = [
  { label: 'Emplois & Talents',       icon: Briefcase, color: 'bg-blue-50 text-blue-600',   types: ['JOB_OPPORTUNITY', 'TALENT_PROFILE'] },
  { label: 'Co-Fondateurs',           icon: Users,     color: 'bg-purple-50 text-purple-600', types: ['CO_FOUNDER_OPPORTUNITY', 'CO_FOUNDER_PROFILE'] },
  { label: 'Idées & Projets',         icon: Lightbulb, color: 'bg-yellow-50 text-yellow-600', types: ['BUSINESS_IDEA', 'PROJECT_SEEKING_SUPPORT'] },
  { label: 'Financement',             icon: DollarSign, color: 'bg-green-50 text-green-600', types: ['FUNDING_OPPORTUNITY', 'INVESTOR_THESIS', 'INVESTOR_PROFILE', 'DEAL_FLOW'] },
  { label: 'Événements & Programmes', icon: Calendar,  color: 'bg-red-50 text-red-600',     types: ['EVENT', 'CALL_FOR_STARTUPS', 'VENTURE_PROGRAM'] },
  { label: 'Services & Soutien',      icon: Rocket,    color: 'bg-orange-50 text-orange-600', types: ['SERVICE_LISTING', 'SERVICE_REQUEST', 'SUPPORT_OFFER', 'MENTORSHIP_BA_OFFER', 'MARKET_ADVISOR'] },
]

// ── Pays ──────────────────────────────────────────────────────────────────────

const AFRICAN_COUNTRIES = [
  'Afrique du Sud', 'Algérie', 'Angola', 'Bénin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cameroun', 'Cap-Vert', 'Centrafrique', 'Comores', 'Congo', 'Côte d\'Ivoire',
  'Djibouti', 'Égypte', 'Érythrée', 'Éthiopie', 'Gabon', 'Gambie', 'Ghana',
  'Guinée', 'Guinée-Bissau', 'Guinée équatoriale', 'Kenya', 'Lesotho', 'Libéria',
  'Libye', 'Madagascar', 'Malawi', 'Mali', 'Maroc', 'Maurice', 'Mauritanie',
  'Mozambique', 'Namibie', 'Niger', 'Nigeria', 'Ouganda', 'Rwanda', 'São Tomé-et-Príncipe',
  'Sénégal', 'Seychelles', 'Sierra Leone', 'Somalie', 'Soudan', 'Soudan du Sud',
  'Tanzanie', 'Tchad', 'Togo', 'Tunisie', 'Zambie', 'Zimbabwe', 'RDC',
]
const DIASPORA_COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Royaume-Uni',
  'Portugal', 'Italie', 'Espagne', 'Allemagne', 'Pays-Bas',
]
const ALL_COUNTRIES = [...AFRICAN_COUNTRIES, ...DIASPORA_COUNTRIES]

// ── Filtres de date ───────────────────────────────────────────────────────────

const DATE_OPTIONS = [
  { label: '24h',    days: 1  },
  { label: '7 jours', days: 7  },
  { label: '30 jours', days: 30 },
  { label: '3 mois',  days: 90 },
]

function getCreatedAfter(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ExplorePage() {
  const [activeGroup, setActiveGroup]   = useState<number | null>(null)
  const [countryFilter, setCountryFilter] = useState('')
  const [dateDays, setDateDays]         = useState<number | null>(null)
  const [remoteOnly, setRemoteOnly]     = useState(false)
  const [countryOpen, setCountryOpen]   = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Ferme le dropdown pays si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const typeFilter   = activeGroup !== null ? CATEGORY_GROUPS[activeGroup].types.join(',') : ''
  const createdAfter = dateDays !== null ? getCreatedAfter(dateDays) : ''
  const hasFilters   = !!(countryFilter || dateDays !== null || remoteOnly)

  const clearFilters = () => {
    setCountryFilter('')
    setDateDays(null)
    setRemoteOnly(false)
  }

  // Construit l'URL de l'API
  const buildUrl = (pageParam?: string) => {
    const params = new URLSearchParams({ status: 'ACTIVE', take: '12' })
    if (typeFilter)   params.set('types', typeFilter)
    if (pageParam)    params.set('cursor', pageParam)
    if (countryFilter) params.set('country', countryFilter)
    if (createdAfter) params.set('createdAfter', createdAfter)
    if (remoteOnly)   params.set('remote', 'true')
    return `/opportunities?${params.toString()}`
  }

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<{ data: Opportunity[]; nextCursor: string | null; hasMore: boolean }>({
    queryKey: ['explore', typeFilter, countryFilter, dateDays, remoteOnly],
    queryFn: ({ pageParam }) => apiJson(buildUrl(pageParam as string | undefined)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 3 * 60 * 1000,
  })

  // IntersectionObserver — charge la page suivante
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { data: profiles } = useQuery<any[]>({
    queryKey: ['explore-profiles'],
    queryFn: () => apiJson('/profiles/lists/members?take=6'),
    enabled: activeGroup === null && !hasFilters,
    staleTime: 3 * 60 * 1000,
  })

  const opportunities: Opportunity[] = data?.pages.flatMap((p) => p.data) ?? []

  // Titre dynamique
  const sectionTitle = useMemo(() => {
    if (activeGroup !== null) return CATEGORY_GROUPS[activeGroup].label
    if (hasFilters) return 'Résultats filtrés'
    return 'Dernières opportunités'
  }, [activeGroup, hasFilters])

  return (
    <div className="bg-gray-50 min-h-screen pb-16">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a237e] to-[#3b49df] py-14 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold text-white mb-3">Explorer SouthConnect</h1>
          <p className="text-white/70 mb-8 text-base">
            Découvrez des opportunités, talents, investisseurs et collaborateurs dans tout l&apos;écosystème.
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

        {/* Catégories */}
        <div className="flex flex-wrap gap-2 mb-6">
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

        {/* ── Filtres avancés ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-gray-200">

          {/* Pays — dropdown custom */}
          <div className="relative" ref={countryRef}>
            <button
              onClick={() => setCountryOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                countryFilter
                  ? 'bg-[#3b49df] text-white border-[#3b49df]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {countryFilter || 'Pays'}
              <ChevronDown className={`w-3 h-3 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
            </button>

            {countryOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setCountryFilter(''); setCountryOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!countryFilter ? 'font-semibold text-[#3b49df]' : 'text-gray-600'}`}
                  >
                    Tous les pays
                  </button>

                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Afrique</div>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCountryFilter(c); setCountryOpen(false) }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${countryFilter === c ? 'font-semibold text-[#3b49df] bg-blue-50' : 'text-gray-700'}`}
                    >
                      {c}
                    </button>
                  ))}

                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Diaspora</div>
                  {DIASPORA_COUNTRIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCountryFilter(c); setCountryOpen(false) }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${countryFilter === c ? 'font-semibold text-[#3b49df] bg-blue-50' : 'text-gray-700'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date de création */}
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDateDays(dateDays === opt.days ? null : opt.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                dateDays === opt.days
                  ? 'bg-[#3b49df] text-white border-[#3b49df]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {/* Remote only */}
          <button
            onClick={() => setRemoteOnly(r => !r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              remoteOnly
                ? 'bg-[#3b49df] text-white border-[#3b49df]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            Remote
          </button>

          {/* Effacer les filtres */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Effacer
            </button>
          )}
        </div>

        {/* Opportunities grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">{sectionTitle}</h2>
            {!hasFilters && (
              <Link
                href={activeGroup !== null ? `/?types=${encodeURIComponent(CATEGORY_GROUPS[activeGroup].types.join(','))}` : '/'}
                className="text-sm text-[#3b49df] font-semibold flex items-center gap-1 hover:underline"
              >
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 mb-3">
                {hasFilters
                  ? 'Aucune opportunité ne correspond à ces filtres.'
                  : 'Aucune opportunité dans cette catégorie pour l\'instant.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-sm text-[#3b49df] font-semibold hover:underline">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opportunities.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
              <div ref={sentinelRef} className="h-1" />
              {isFetchingNextPage && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100" />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Personnes — seulement sur "Tout" sans filtres */}
        {activeGroup === null && !hasFilters && (profiles?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Personnes sur SouthConnect</h2>
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
                  <Avatar src={p.profilePic} name={p.name} sizeClass="w-12 h-12" sizes="64px" />
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
