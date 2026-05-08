'use client'

import { Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiJson } from '@/app/lib/api'
import Link from 'next/link'
import { Search, Briefcase, UserCircle, MessageCircle, MapPin } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams?.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [activeTab, setActiveTab] = useState<'all' | 'opportunities' | 'profiles' | 'discussions'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['search', initialQ],
    queryFn: () => apiJson(`/search?q=${encodeURIComponent(initialQ)}`),
    enabled: initialQ.length >= 2,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    }
  }

  const opportunities = data?.opportunities ?? []
  const profiles = data?.profiles ?? []
  const discussions = data?.discussions ?? []
  const total = opportunities.length + profiles.length + discussions.length

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search opportunities, profiles, discussions..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] bg-white shadow-sm"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#3b49df] text-white text-xs font-semibold rounded-lg hover:bg-[#2d3aba]"
          >
            Search
          </button>
        </div>
      </form>

      {!initialQ && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Type at least 2 characters to search.</p>
        </div>
      )}

      {initialQ && isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {initialQ && !isLoading && (
        <>
          {/* Result tabs */}
          <div className="flex gap-1 mb-5 text-sm border-b border-gray-200">
            {([
              { id: 'all' as const, label: `All (${total})` },
              { id: 'opportunities' as const, label: `Opportunities (${opportunities.length})` },
              { id: 'profiles' as const, label: `Profiles (${profiles.length})` },
              { id: 'discussions' as const, label: `Discussions (${discussions.length})` },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pb-3 px-3 border-b-2 font-semibold ${
                  activeTab === id
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {total === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No results for <strong>"{initialQ}"</strong>.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Opportunities */}
              {(activeTab === 'all' || activeTab === 'opportunities') && opportunities.length > 0 && (
                <div>
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
                      <Briefcase className="w-4 h-4" />
                      Opportunities
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    {opportunities.map((opp: any) => (
                      <Link
                        key={opp.id}
                        href={`/opportunities/${opp.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-gray-400">
                          {opp.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={opp.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            opp.type?.slice(0, 2)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{opp.name}</div>
                          <div className="text-xs text-gray-400">
                            {opp.type?.replace(/_/g, ' ')}
                            {opp.owner?.name && ` · ${opp.owner.name}`}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Profiles */}
              {(activeTab === 'all' || activeTab === 'profiles') && profiles.length > 0 && (
                <div>
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
                      <UserCircle className="w-4 h-4" />
                      Profiles
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    {profiles.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/profiles/${p.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-[#3b49df]">
                          {p.profilePic ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profilePic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            p.name?.[0] || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{p.name || 'Unknown'}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            {p.btoBProfile?.companyName && <span>{p.btoBProfile.companyName}</span>}
                            {(p.city || p.country) && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {[p.city, p.country].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussions */}
              {(activeTab === 'all' || activeTab === 'discussions') && discussions.length > 0 && (
                <div>
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
                      <MessageCircle className="w-4 h-4" />
                      Discussions
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    {discussions.map((d: any) => (
                      <Link
                        key={d.id}
                        href={`/chat/public/${d.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-[#3b49df]">
                          {d.title?.[0] || 'D'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{d.title}</div>
                          {d.description && (
                            <div className="text-xs text-gray-400 truncate">{d.description}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8"><div className="h-12 bg-gray-100 rounded-xl animate-pulse" /></div>}>
      <SearchContent />
    </Suspense>
  )
}
