'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Plus, Clock, TrendingUp, Star, LayoutGrid, Map, List } from 'lucide-react'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'
import { useAuth } from '@/app/lib/AuthContext'

export default function HomePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'newest' | 'trending' | 'favorites'>('newest')
  const [viewMode, setViewMode] = useState<'post' | 'map' | 'gallery'>('post')
  const [search, setSearch] = useState('')

  // Toutes les opportunités (vue publique)
  const {
    data: opportunities,
    isLoading: isLoadingOpportunities,
  } = useQuery({
    queryKey: ['opportunities', search],
    queryFn: () => {
      let endpoint = '/opportunities?take=50'
      if (search) endpoint += `&search=${encodeURIComponent(search)}`
      return apiJson(endpoint)
    },
  })

  // Opportunités sauvegardées (favorites) pour l'utilisateur connecté
  const {
    data: saved,
    isLoading: isLoadingSaved,
  } = useQuery({
    queryKey: ['saved-opportunities'],
    queryFn: () => apiJson('/social/saved'),
    enabled: !!user,
  })

  const searchLower = search.toLowerCase()

  const filterBySearch = (list: any[] = []) =>
    !searchLower
      ? list
      : list.filter((op) => {
          const haystack = `${op.name || ''} ${op.punchline || ''} ${op.description || ''}`.toLowerCase()
          return haystack.includes(searchLower)
        })

  let displayed: any[] = []
  let isLoadingList = false

  if (tab === 'favorites') {
    const base = filterBySearch(saved || [])
    displayed = base
    isLoadingList = !!user && isLoadingSaved && !saved
  } else if (tab === 'trending') {
    const base = filterBySearch(opportunities || [])
    displayed = [...base].sort((a, b) => {
      const byLikes = (b.likesCount || 0) - (a.likesCount || 0)
      if (byLikes !== 0) return byLikes
      const bySaved = (b.savedCount || 0) - (a.savedCount || 0)
      if (bySaved !== 0) return bySaved
      return (b.viewsCount || 0) - (a.viewsCount || 0)
    })
    isLoadingList = isLoadingOpportunities
  } else {
    // newest
    displayed = filterBySearch(opportunities || [])
    isLoadingList = isLoadingOpportunities
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[300px] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a237e] to-[#3f51b5] z-0">
          <img 
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80" 
            alt="" 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Welcome to D-fund Platform
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8">
            Startups meet investors. Investors meet opportunities. Companies meet innovation. With D-fund, the right connections turn into real deals.
          </p>
          <Link 
            href="/register" 
            className="inline-block px-8 py-3 bg-[#3b49df] text-white rounded-lg font-bold text-lg hover:bg-[#2d3aba] transition-colors"
          >
            Join the Ecosystem
          </Link>
        </div>
      </section>

      {/* Explore Section */}
      <section className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Explore opportunities</h2>
          <Link 
            href="/opportunities/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg font-semibold hover:bg-[#2d3aba] transition-colors self-start"
          >
            <Plus className="w-5 h-5" />
            Create
          </Link>
        </div>

        {/* Filters & Tabs */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-6">
              {[
                { id: 'newest', label: 'Newest', icon: Clock },
                { id: 'trending', label: 'Trending', icon: TrendingUp },
                { id: 'favorites', label: 'Favorites', icon: Star },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
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
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'post', label: 'Post', icon: List },
                { id: 'map', label: 'Map', icon: Map },
                { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === v.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#3b49df] transition-all"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Opportunity List */}
        <div className={`mt-8 ${viewMode === 'gallery' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-4'}`}>
          {isLoadingList ? (
            Array.from({ length: viewMode === 'gallery' ? 6 : 5 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 animate-pulse rounded-xl ${viewMode === 'gallery' ? 'h-48' : 'h-32'}`} />
            ))
          ) : displayed.length > 0 ? (
            displayed.map((opportunity: any) =>
              viewMode === 'gallery' ? (
                <GalleryCard key={opportunity.id} opportunity={opportunity} />
              ) : (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              )
            )
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              {tab === 'favorites' ? (
                user ? (
                  'You have no favorites yet. Use the bookmark button on an opportunity to add it here.'
                ) : (
                  'Sign in to see your favorite opportunities.'
                )
              ) : tab === 'trending' ? (
                'No trending opportunities yet.'
              ) : search ? (
                'No opportunities match your search.'
              ) : (
                'No opportunities found.'
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function GalleryCard({ opportunity }: { opportunity: any }) {
  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
  return (
    <a href={`/opportunities/${opportunity.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-28 bg-gray-100 overflow-hidden">
          {opportunity.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={opportunity.image}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
              {opportunity.type?.replace(/_/g, ' ')}
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="text-[10px] font-bold text-[#3b49df] uppercase tracking-wider mb-0.5">
            {opportunity.type?.replace(/_/g, ' ')}
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
