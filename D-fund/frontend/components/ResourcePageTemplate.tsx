'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson } from '@/app/lib/api'
import OpportunityCard from '@/components/OpportunityCard'
import Link from 'next/link'
import { Search, Plus, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

interface Props {
  title: string
  description: string
  type: string
  icon: LucideIcon
  createLabel?: string
}

export default function ResourcePageTemplate({ title, description, type, icon: Icon, createLabel }: Props) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: qk.resourcePage(type, debouncedSearch),
    queryFn: () => {
      const params = new URLSearchParams({ type, take: '50' })
      if (debouncedSearch.trim().length >= 2) params.set('search', debouncedSearch.trim())
      return apiJson<{ data: any[]; total: number }>(`/opportunities?${params}`)
    },
  })

  const items: any[] = data?.data ?? []
  const total: number = data?.total ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#3b49df]/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-[#3b49df]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>
            </div>
            <Link
              href="/opportunities/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3aba] transition-colors shrink-0 self-start"
            >
              <Plus className="w-4 h-4" />
              {createLabel ?? 'Publier'}
            </Link>
          </div>

          {/* Search */}
          <div className="mt-6 relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher dans ${title.toLowerCase()}…`}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-5xl py-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <p className="text-xs text-gray-400 mb-4">
              {total} résultat{total !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {items.map((op) => (
                <OpportunityCard key={op.id} opportunity={op} />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Icon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600 mb-1">
              {debouncedSearch ? 'Aucun résultat pour cette recherche' : `Aucun élément dans ${title.toLowerCase()}`}
            </p>
            {!debouncedSearch && (
              <p className="text-xs text-gray-400 mb-5">Soyez le premier à en publier un !</p>
            )}
            {debouncedSearch ? (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-[#3b49df] font-semibold hover:underline"
              >
                Effacer la recherche
              </button>
            ) : (
              <Link
                href="/opportunities/new"
                className="inline-block px-5 py-2 bg-[#3b49df] text-white rounded-lg text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
              >
                {createLabel ?? 'Publier'}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
