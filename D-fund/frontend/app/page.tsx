'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Search, Filter, Plus, Clock, TrendingUp, Star, LayoutGrid, List, ChevronDown, X } from 'lucide-react'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'
import { useAuth } from '@/app/lib/AuthContext'
import type { Opportunity, OpportunityListResponse } from '@/app/lib/types'

const PAGE_SIZE = 20

const TYPE_LABELS: Record<string, string> = {
  JOB_OPPORTUNITY: 'Job',
  TALENT_PROFILE: 'Talent',
  CO_FOUNDER_OPPORTUNITY: 'Co-Founder',
  CO_FOUNDER_PROFILE: 'Co-Founder Profile',
  BUSINESS_IDEA: 'Business Idea',
  SUPPORT_OFFER: 'Support Offer',
  SERVICE_LISTING: 'Service',
  SERVICE_REQUEST: 'Service Request',
  DEAL_FLOW: 'Deal Flow',
  INVESTOR_THESIS: 'Investor Thesis',
  INVESTOR_PROFILE: 'Investor',
  FUNDING_OPPORTUNITY: 'Funding',
  EVENT: 'Event',
  CALL_FOR_STARTUPS: 'Call for Startups',
  MENTORSHIP_BA_OFFER: 'Mentorship',
  PROJECT_SEEKING_SUPPORT: 'Project Support',
  VENTURE_PROGRAM: 'Venture Program',
  CHILL_WORK_SPOT: 'Work Spot',
  MARKET_ADVISOR: 'Market Advisor',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function HomePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'newest' | 'trending' | 'favorites'>('newest')
  const [viewMode, setViewMode] = useState<'post' | 'gallery'>('post')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite query for newest + trending tabs
  const {
    data: pages,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['opportunities-feed', debouncedSearch, typeFilter, tab === 'trending' ? 'trending' : 'newest'],
    queryFn: ({ pageParam = 0 }) => {
      const params = new URLSearchParams()
      params.set('take', String(PAGE_SIZE))
      params.set('skip', String(pageParam))
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (typeFilter) params.set('type', typeFilter)
      if (tab === 'trending') params.set('sort', 'trending')
      return apiJson<OpportunityListResponse>(`/opportunities?${params}`)
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
    enabled: tab !== 'favorites',
  })

  // Saved (favorites tab)
  const { data: saved, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-opportunities'],
    queryFn: () => apiJson('/social/saved'),
    enabled: !!user && tab === 'favorites',
  })

  // Intersection Observer — auto-load next page
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

  // Flatten pages into a single list
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
      {/* Hero */}
      <section className="relative h-[260px] flex items-center justify-center text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 30%, #1a237e 60%, #3f51b5 100%)' }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #f59e0b 0%, transparent 70%)' }}
        />
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
            Welcome to D-fund Platform
          </h1>
          <p className="text-base md:text-lg text-white/75 mb-6 max-w-2xl mx-auto leading-relaxed">
            Startups meet investors. Investors meet opportunities. Companies meet innovation.
            With D-fund, the right connections turn into real deals.
          </p>
          {!user && (
            <Link
              href="/register"
              className="inline-block px-6 py-2.5 bg-[#3b49df] text-white rounded-lg font-bold hover:bg-[#2d3aba] transition-colors shadow-lg"
            >
              Join the Ecosystem
            </Link>
          )}
        </div>
      </section>

      {/* Feed */}
      <section className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Explore opportunities</h2>
          <Link
            href="/opportunities/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg font-semibold hover:bg-[#2d3aba] transition-colors self-start"
          >
            <Plus className="w-5 h-5" />
            Create
          </Link>
        </div>

        {/* Tabs + toolbar */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-6">
              {([
                { id: 'newest' as const, label: 'Newest', icon: Clock },
                { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
                { id: 'favorites' as const, label: 'Favorites', icon: Star },
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

            {/* View toggle */}
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
                placeholder="Search opportunities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#3b49df] transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type filter */}
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
                    All types
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
                {total !== undefined ? `${total} result${total !== 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Close dropdown on outside click */}
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
                user
                  ? 'No saved opportunities yet. Use the bookmark button on any opportunity.'
                  : 'Sign in to see your favorites.'
              ) : debouncedSearch || typeFilter ? (
                <div className="space-y-2">
                  <p>No results for your search.</p>
                  <button
                    onClick={() => { setSearch(''); setTypeFilter('') }}
                    className="text-xs text-[#3b49df] font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                'No opportunities yet.'
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
                Loading more…
              </div>
            ) : hasNextPage ? null : allItems.length > 0 ? (
              <p className="text-xs text-gray-400">All {total} opportunities loaded</p>
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
    <a href={`/opportunities/${opportunity.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-28 bg-gray-100 overflow-hidden">
          {opportunity.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opportunity.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
    </a>
  )
}
