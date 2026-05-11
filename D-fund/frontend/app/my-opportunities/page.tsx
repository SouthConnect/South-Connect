'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { Plus, Users, Pencil, Eye, CheckCircle, Clock, Archive, Send, Info } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ConfirmModal'
import AuthGuard from '@/components/AuthGuard'
import type { Opportunity } from '@/app/lib/types'

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'CLOSED'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-50 text-yellow-700',
  ACTIVE: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-red-50 text-red-600',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending review',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  CLOSED: 'Closed',
}

function MyOpportunitiesSkeleton() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function MyOpportunitiesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)

  const { data: opportunities, isLoading, isError, error } = useQuery({
    queryKey: ['my-opportunities', user?.id],
    queryFn: () => apiJson(`/opportunities/user/${user?.id}?take=50`),
    enabled: !!user?.id,
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PENDING' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-opportunities', user?.id] })
      toast.success('Submitted for review! Your opportunity will be visible once approved.')
    },
    onError: (err: any) => toast.error(err.message || 'Impossible de soumettre l\'opportunité.'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ARCHIVED' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-opportunities', user?.id] })
      toast.success('Opportunity archived.')
    },
    onError: (err: any) => toast.error(err.message || 'Impossible d\'archiver l\'opportunité.'),
  })

  const resubmitMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PENDING' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-opportunities', user?.id] })
      toast.success('Resubmitted for review!')
    },
    onError: (err: any) => toast.error(err.message || 'Impossible de resoumettre l\'opportunité.'),
  })

  const filtered: Opportunity[] = (opportunities as Opportunity[] ?? []).filter((op) =>
    statusFilter === 'ALL' ? true : op.status === statusFilter
  )

  return (
    <AuthGuard skeleton={<MyOpportunitiesSkeleton />}>
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Opportunities</h1>
          <p className="text-sm text-gray-500">Manage the opportunities you have created.</p>
        </div>
        <Link
          href="/opportunities/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm font-semibold hover:bg-[#2d3aba]"
        >
          <Plus className="w-4 h-4" />
          Create
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 text-sm overflow-x-auto">
        {(['ALL', 'DRAFT', 'ACTIVE', 'PENDING', 'ARCHIVED', 'CLOSED'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`pb-3 px-3 border-b-2 font-semibold whitespace-nowrap ${
              statusFilter === s
                ? 'border-[#3b49df] text-[#3b49df]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
            {s !== 'ALL' && opportunities && (
              <span className="ml-1 text-xs text-gray-400">
                ({opportunities.filter((o: Opportunity) => o.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Moderation banner — visible quand il y a des opportunités en attente */}
      {opportunities?.some((o: Opportunity) => o.status === 'PENDING') && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
          <div>
            <span className="font-semibold">Under review</span> — One or more of your opportunities are awaiting approval by our moderation team. They will become visible to the community once approved (usually within 24h).
          </div>
        </div>
      )}

      {/* Draft banner */}
      {opportunities?.some((o: Opportunity) => o.status === 'DRAFT') && !opportunities?.some((o: Opportunity) => o.status === 'PENDING') && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            You have <span className="font-semibold">draft opportunities</span>. Click the <Send className="inline w-3.5 h-3.5 mx-0.5" /> button to submit them for review and make them visible to the community.
          </div>
        </div>
      )}

      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error)?.message || 'Unable to load your opportunities.'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((opp) => (
            <div
              key={opp.id}
              className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4"
            >
              {/* Cover thumbnail */}
              <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-gray-400 text-xs font-bold">
                {opp.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opp.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  opp.type?.slice(0, 2)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{opp.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[opp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[opp.status] || opp.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>{opp.type?.replace(/_/g, ' ')}</span>
                  {(opp._count?.applications ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-[#3b49df] font-semibold">
                      <Users className="w-3 h-3" />
                      {opp._count?.applications} application{opp._count?.applications !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span>{new Date(opp.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {(opp._count?.applications ?? 0) > 0 && (
                  <Link
                    href={`/opportunities/${opp.id}/applications`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#3b49df]/10 text-[#3b49df] hover:bg-[#3b49df]/20"
                  >
                    <Users className="w-3 h-3" />
                    Review
                  </Link>
                )}
                <Link
                  href={`/opportunities/${opp.id}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/opportunities/${opp.id}/edit`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                {opp.status === 'DRAFT' && (
                  <button
                    onClick={() => publishMutation.mutate(opp.id)}
                    disabled={publishMutation.isPending}
                    title="Publish"
                    className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                {opp.status === 'ACTIVE' && (
                  <button
                    onClick={() => setConfirmArchive(opp.id)}
                    disabled={archiveMutation.isPending}
                    title="Archive"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {opp.status === 'PENDING' && (
                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                    <Clock className="w-3.5 h-3.5" />
                    Waiting
                  </span>
                )}
                {opp.status === 'ARCHIVED' && (
                  <button
                    onClick={() => resubmitMutation.mutate(opp.id)}
                    disabled={resubmitMutation.isPending}
                    title="Resubmit for review"
                    className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-500">
          {statusFilter === 'ALL'
            ? 'You have not created any opportunities yet.'
            : `No opportunities with status "${STATUS_LABELS[statusFilter]}".`}
        </div>
      )}

      <ConfirmModal
        open={!!confirmArchive}
        title="Archive this opportunity?"
        description="It will no longer be visible to the community. You can resubmit it for review later."
        confirmLabel="Archive"
        cancelLabel="Keep active"
        variant="warning"
        onConfirm={() => {
          if (confirmArchive) archiveMutation.mutate(confirmArchive)
          setConfirmArchive(null)
        }}
        onCancel={() => setConfirmArchive(null)}
      />
    </div>
    </AuthGuard>
  )
}
