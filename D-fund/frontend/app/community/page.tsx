'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { Search } from 'lucide-react'
import Link from 'next/link'

export default function CommunityPage() {
  const [tab, setTab] = useState<'btoc' | 'btob'>('btoc')
  const [search, setSearch] = useState('')

  const { data: talents, isLoading: loadingTalents } = useQuery({
    queryKey: ['community-btoc'],
    queryFn: () => apiJson('/profiles/lists/talents'),
  })

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['community-btob'],
    queryFn: () => apiJson('/profiles/lists/companies'),
  })

  const list = tab === 'btoc' ? talents : companies
  const isLoading = tab === 'btoc' ? loadingTalents : loadingCompanies

  const filtered = (list || []).filter((item: any) => {
    if (!search) return true
    const name = tab === 'btoc' ? item.user?.name : item.companyName
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
          <p className="text-sm text-gray-500">
            Discover talents and companies in the D-fund ecosystem.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 border-b border-gray-200 text-sm">
          <button
            onClick={() => setTab('btoc')}
            className={`pb-3 px-1 border-b-2 font-semibold ${
              tab === 'btoc'
                ? 'border-[#3b49df] text-[#3b49df]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            BtoC
          </button>
          <button
            onClick={() => setTab('btob')}
            className={`pb-3 px-1 border-b-2 font-semibold ${
              tab === 'btob'
                ? 'border-[#3b49df] text-[#3b49df]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            BtoB
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-[#3b49df]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 animate-pulse" />
          ))
        ) : filtered.length ? (
          filtered.map((item: any) => (
            <CommunityRow key={item.id} item={item} tab={tab} />
          ))
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm">
            No profiles found.
          </div>
        )}
      </div>
    </div>
  )
}

function CommunityRow({ item, tab }: { item: any; tab: 'btoc' | 'btob' }) {
  const name = tab === 'btoc' ? item.user?.name : item.companyName
  const followers = item.followersCount ?? 0
  const opportunities = item.opportunitiesCount ?? 0
  const avatar =
    (tab === 'btoc' ? item.user?.profilePic : item.logo) || undefined

  return (
    <Link
      href={tab === 'btoc' ? `/profiles/${item.userId}` : `/profiles/${item.userId}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-semibold text-[#3b49df]">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            name?.[0] || '?'
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">
            {followers} Followers • {opportunities} Opportunities
          </div>
        </div>
      </div>
    </Link>
  )
}

