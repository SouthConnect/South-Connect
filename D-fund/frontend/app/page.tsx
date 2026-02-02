'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Plus, Clock, TrendingUp, Star, LayoutGrid, Map, List } from 'lucide-react'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'

export default function HomePage() {
  const [tab, setTab] = useState<'newest' | 'trending' | 'favorites'>('newest')
  const [viewMode, setViewMode] = useState<'post' | 'map' | 'gallery'>('post')
  const [search, setSearch] = useState('')

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['opportunities', tab, search],
    queryFn: () => {
      let endpoint = '/opportunities?take=20'
      if (search) endpoint += `&search=${encodeURIComponent(search)}`
      if (tab === 'newest') endpoint += '&orderBy=createdAt:desc'
      // trending et favorites nécessitent une logique backend plus poussée, pour l'instant on reste simple
      return apiJson(endpoint)
    }
  })

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
        <div className="mt-8 space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
            ))
          ) : opportunities?.length > 0 ? (
            opportunities.map((opportunity: any) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No opportunities found.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
