'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import { Search, Copy, CheckCheck, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ReferralPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['referral', user?.id],
    queryFn: () => apiJson('/referral'),
    enabled: !!user?.id,
  })

  const createMutation = useMutation({
    mutationFn: () => apiJson('/referral', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referral', user?.id] }),
    onError: (err: any) => toast.error(err.message || 'Impossible de créer le code de parrainage.'),
  })

  const codes: any[] = data?.codes || []
  const stats = data?.stats || { totalCodes: 0, totalReferrals: 0, totalPotentialAmount: 0, totalEarned: 0 }

  const filtered = codes.filter((c: any) =>
    !search || c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.opportunity?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => toast.error('Impossible de copier le code'))
  }

  return (
    <AuthGuard message="Sign in to access your referral program.">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Banner */}
        <div
          className="relative rounded-2xl overflow-hidden mb-8 p-8"
          style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 40%, #c2410c 100%)' }}
        >
          <div className="relative z-10">
            <p className="text-white/60 text-sm mb-1 uppercase tracking-widest font-semibold">
              Referral Program
            </p>
            <h1 className="text-2xl font-bold text-white mb-2">
              Track your referral earnings and progress
            </h1>
            <p className="text-white/60 text-sm max-w-xl">
              Share your referral codes with your network and earn rewards when they join D-fund.
            </p>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 text-[120px] font-black text-white select-none">
            %
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total referral code" value={isLoading ? '…' : stats.totalCodes} />
          <StatCard label="Total referrals" value={isLoading ? '…' : stats.totalReferrals} />
          <StatCard label="Total earning potential" value={isLoading ? '…' : `$${stats.totalPotentialAmount}`} />
          <StatCard label="Total earned" value={isLoading ? '…' : `$${stats.totalEarned}`} highlight />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">My referrals</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-9 pr-4 py-1.5 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-[#3b49df] w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b49df] text-white rounded-lg text-xs font-semibold hover:bg-[#2d3aba] disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                New code
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="px-5 py-12 text-center text-sm text-red-500">
              Impossible de charger vos codes de parrainage.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No referral codes yet.{' '}
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                className="text-[#3b49df] font-semibold hover:underline"
              >
                Generate your first code
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-5 gap-4 px-5 py-3 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <span>Referral Code</span>
                <span>Type</span>
                <span>Total Referrals</span>
                <span>Earning Potential</span>
                <span>Associated Opportunity</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.map((c: any) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#3b49df] bg-[#3b49df]/5 px-2 py-1 rounded">
                        {c.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(c.code)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {copied === c.code ? (
                          <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="hidden md:block">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.type === 'NEW_USER' ? 'bg-blue-50 text-blue-600' :
                        c.type === 'TALENT_HUNT' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {c.type?.replace(/_/g, ' ') || 'New User'}
                      </span>
                    </div>

                    <div className="hidden md:block">
                      <span className="text-xs font-semibold text-gray-700">{c.usesCount ?? 0}</span>
                    </div>

                    <div className="hidden md:block">
                      <span className="text-xs font-semibold text-gray-700">
                        {c.potentialAmount ? `$${c.potentialAmount}` : '$0'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      {c.opportunity ? (
                        <Link
                          href={`/opportunities/${c.opportunity.id}`}
                          className="text-xs font-semibold text-gray-900 hover:text-[#3b49df] truncate"
                        >
                          {c.opportunity.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-[#3b49df]' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}
