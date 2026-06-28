'use client'

import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  Search, Filter, Plus, Clock, TrendingUp, Star,
  LayoutGrid, List, ChevronDown, X,
  ArrowRight, Zap, Users, DollarSign, Briefcase,
} from 'lucide-react'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/lib/AuthContext'
import type { Opportunity, OpportunityListResponse } from '@/app/lib/types'

const PAGE_SIZE = 20

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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Router ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  return user ? <AppFeed /> : <LandingPage />
}

// ── Landing Page (non-logged) ────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1e2d6d 100%)' }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 100%, #f59e0b 0%, transparent 65%)' }}
        />
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold mb-8 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            🌍 Fait pour les entrepreneurs africains
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-[1.1]">
            La plateforme tout-en-un
            <br />
            <span className="text-yellow-400">pour les entrepreneurs africains</span>
          </h1>

          <p className="text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connectez-vous avec des investisseurs, trouvez des co-fondateurs, accédez aux talents et aux opportunités de financement, tout en un seul endroit pour l'écosystème startup africain.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-yellow-400 text-gray-900 rounded-xl font-black text-base hover:bg-yellow-300 transition-all shadow-xl hover:shadow-yellow-400/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              Commencer gratuitement →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-base border border-white/25 hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Explorer les opportunités
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-xs flex flex-col items-center gap-1">
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-y border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Entrepreneurs', value: '2 400+' },
            { label: 'Opportunités', value: '850+' },
            { label: 'Investisseurs', value: '120+' },
            { label: 'Pays', value: '28' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-black text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Tout ce dont vous avez besoin pour grandir
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Une plateforme. Toutes les connexions dont votre startup a besoin pour se développer en Afrique et au-delà.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                Icon: DollarSign,
                bg: 'bg-green-50',
                fg: 'text-green-600',
                title: 'Financement & Investisseurs',
                desc: 'Connectez-vous avec 120+ investisseurs, business angels et VCs cherchant activement des startups africaines à financer.',
              },
              {
                Icon: Users,
                bg: 'bg-blue-50',
                fg: 'text-blue-600',
                title: 'Talents & Co-Fondateurs',
                desc: 'Trouvez le co-fondateur idéal ou recrutez les meilleurs talents dans un vivier vérifié de professionnels africains.',
              },
              {
                Icon: Briefcase,
                bg: 'bg-purple-50',
                fg: 'text-purple-600',
                title: 'Programmes & Mentorat',
                desc: "Accédez à des incubateurs, accélérateurs et mentors qui ont construit et développé des entreprises africaines.",
              },
            ].map(({ Icon, bg, fg, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} ${fg} flex items-center justify-center mb-5`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Opérationnel en 3 étapes
          </h2>
          <p className="text-gray-500 text-center mb-14">
            Pas d'intermédiaires. Pas de processus longs. Connectez-vous et grandissez.
          </p>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'Créez votre profil',
                desc: "Parlez-nous de votre startup, de votre rôle et de ce que vous recherchez.",
              },
              {
                step: '02',
                title: 'Découvrez les opportunités',
                desc: 'Parcourez les financements, talents, co-fondateurs, mentors et programmes filtrés pour l\'Afrique.',
              },
              {
                step: '03',
                title: 'Connectez-vous & grandissez',
                desc: 'Échangez directement, sauvegardez vos favoris et concluez des accords plus rapidement.',
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col">
                <div className="text-7xl font-black text-gray-100 leading-none mb-4 select-none">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live opportunity preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dernières opportunités</h2>
              <p className="text-gray-500 text-sm mt-1">Mises à jour quotidiennement depuis toute l'Afrique</p>
            </div>
            <Link
              href="/register"
              className="flex items-center gap-2 text-[#3b49df] font-semibold text-sm hover:underline"
            >
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <OpportunityPreview />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-[#1e2d6d] text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black mb-4">Prêt à développer votre startup ?</h2>
          <p className="text-white/65 text-lg mb-10">
            Rejoignez 2 400+ entrepreneurs africains qui construisent déjà sur SouthConnect.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-yellow-400 text-gray-900 rounded-xl font-black text-lg hover:bg-yellow-300 transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Créer son compte gratuitement →
          </Link>
        </div>
      </section>

    </div>
  )
}

function OpportunityPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ['opportunities-preview'],
    queryFn: () => apiJson<OpportunityListResponse>('/opportunities?take=3&skip=0'),
  })

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  const items = data?.data ?? []
  if (!items.length) return null

  return (
    <div className="space-y-3">
      {items.map((op) => (
        <OpportunityCard key={op.id} opportunity={op} />
      ))}
    </div>
  )
}

// ── App Feed (logged-in) ──────────────────────────────────────────────────────

function AppFeed() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'newest' | 'trending' | 'favorites'>('newest')
  const [viewMode, setViewMode] = useState<'post' | 'gallery'>('post')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data: pages,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['opportunities-feed', debouncedSearch, typeFilter, tab === 'trending' ? 'trending' : 'newest'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams()
      params.set('take', String(PAGE_SIZE))
      if (pageParam) params.set('cursor', pageParam)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (typeFilter) params.set('type', typeFilter)
      if (tab === 'trending') params.set('sort', 'trending')
      return apiJson<OpportunityListResponse>(`/opportunities?${params}`)
    },
    getNextPageParam: (lastPage): string | undefined =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: tab !== 'favorites',
  })

  const { data: saved, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-opportunities'],
    queryFn: () => apiJson('/social/saved'),
    enabled: !!user && tab === 'favorites',
  })

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allItems: Opportunity[] = tab === 'favorites'
    ? (saved ?? []).filter((op: Opportunity) => {
        if (!debouncedSearch) return true
        const hay = `${op.name || ''} ${op.punchline || ''}`.toLowerCase()
        return hay.includes(debouncedSearch.toLowerCase())
      })
    : (pages?.pages.flatMap((p) => p.data) ?? [])

  const isLoadingList = tab === 'favorites' ? isLoadingSaved : isLoading
  const total = tab !== 'favorites' ? pages?.pages[0]?.total : undefined

  return (
    <div className="flex flex-col min-h-screen">
      {/* Compact logged-in header */}
      <section className="relative h-[140px] flex items-center justify-center text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 30%, #1a237e 60%, #3f51b5 100%)' }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #f59e0b 0%, transparent 70%)' }}
        />
        <div className="relative z-10 text-center px-4">
          <p className="text-white/60 text-sm font-medium mb-1">Bon retour</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {user?.name ? user.name.split(' ')[0] : 'Votre fil'}
          </h1>
        </div>
      </section>

      {/* Feed */}
      <section className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Explorer les opportunités</h2>
          <Link
            href="/opportunities/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg font-semibold hover:bg-[#2d3aba] transition-colors self-start"
          >
            <Plus className="w-5 h-5" />
            Créer
          </Link>
        </div>

        {/* Tabs + toolbar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-6">
              {([
                { id: 'newest' as const, label: 'Récent', icon: Clock },
                { id: 'trending' as const, label: 'Tendance', icon: TrendingUp },
                { id: 'favorites' as const, label: 'Favoris', icon: Star },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    tab === t.id
                      ? 'border-[#3b49df] text-[#3b49df]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex bg-gray-100 p-1 rounded-lg">
              {([
                { id: 'post' as const, icon: List },
                { id: 'gallery' as const, icon: LayoutGrid },
              ]).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <v.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Search + type filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des opportunités…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#3b49df] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowTypeFilter((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  typeFilter
                    ? 'border-[#3b49df] bg-[#3b49df]/5 text-[#3b49df]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                {typeFilter ? TYPE_LABELS[typeFilter] ?? typeFilter : 'Type'}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showTypeFilter && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                  <button
                    onClick={() => { setTypeFilter(''); setShowTypeFilter(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${!typeFilter ? 'font-semibold text-[#3b49df]' : 'text-gray-700'}`}
                  >
                    Tous les types
                  </button>
                  <div className="border-t border-gray-100" />
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => { setTypeFilter(value); setShowTypeFilter(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${typeFilter === value ? 'font-semibold text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(typeFilter || debouncedSearch) && (
              <span className="text-xs text-gray-400">
                {total !== undefined ? `${total} résultat${total !== 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>
        </div>

        {showTypeFilter && (
          <div className="fixed inset-0 z-10" onClick={() => setShowTypeFilter(false)} />
        )}

        {/* List */}
        <div className={viewMode === 'gallery' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}>
          {isLoadingList ? (
            Array.from({ length: viewMode === 'gallery' ? 6 : 5 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 animate-pulse rounded-xl ${viewMode === 'gallery' ? 'h-48' : 'h-28'}`} />
            ))
          ) : allItems.length > 0 ? (
            allItems.map((op) =>
              viewMode === 'gallery' ? (
                <GalleryCard key={op.id} opportunity={op} />
              ) : (
                <OpportunityCard key={op.id} opportunity={op} />
              )
            )
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
              {tab === 'favorites' ? (
                'Aucune opportunité sauvegardée. Utilisez le bouton signet sur une opportunité.'
              ) : debouncedSearch || typeFilter ? (
                <div className="space-y-2">
                  <p>Aucun résultat pour votre recherche.</p>
                  <button
                    onClick={() => { setSearch(''); setTypeFilter('') }}
                    className="text-xs text-[#3b49df] font-semibold hover:underline"
                  >
                    Effacer les filtres
                  </button>
                </div>
              ) : (
                'Aucune opportunité pour l\'instant.'
              )}
            </div>
          )}
        </div>

        {/* Infinite scroll sentinel */}
        {tab !== 'favorites' && (
          <div ref={sentinelRef} className="mt-8 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex gap-2 items-center text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-[#3b49df] border-t-transparent rounded-full animate-spin" />
                Chargement…
              </div>
            ) : hasNextPage ? null : allItems.length > 0 ? (
              <p className="text-xs text-gray-400">Toutes les {total} opportunités chargées</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}

function GalleryCard({ opportunity }: { opportunity: Opportunity }) {
  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short',
  })
  return (
    <Link href={`/opportunities/${opportunity.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-28 bg-gray-100 overflow-hidden relative">
          {opportunity.image ? (
            <Image src={opportunity.image} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 400px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
              {opportunity.type?.replace(/_/g, ' ')}
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="text-[10px] font-bold text-[#3b49df] uppercase tracking-wider mb-0.5">
            {TYPE_LABELS[opportunity.type] ?? opportunity.type?.replace(/_/g, ' ')}
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">{opportunity.name}</div>
          <div className="text-xs text-gray-400 mt-1 truncate">
            {opportunity.owner?.name} · {date}
          </div>
        </div>
      </div>
    </Link>
  )
}
