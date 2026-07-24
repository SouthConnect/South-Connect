'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import Link from 'next/link'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { Plus, Users, Pencil, Eye, CheckCircle, Clock, Archive, Send, Info } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ConfirmModal'
import AuthGuard from '@/components/AuthGuard'
import type { Opportunity } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'CLOSED'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-50 text-yellow-700',
  ACTIVE: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-red-50 text-red-600',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  ACTIVE: 'Active',
  ARCHIVED: 'Archivée',
  CLOSED: 'Fermée',
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
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const { data: oppResponse, isLoading, isError, error } = useQuery({
    queryKey: qk.myOpportunities(user?.id ?? ''),
    queryFn: () => apiJson<{ data: Opportunity[]; total: number; hasMore: boolean }>(`/opportunities/user/${user?.id}?take=100`),
    enabled: !!user?.id,
  })
  const opportunities = oppResponse?.data

  const publishMutation = useTrackedMutation('opportunity.publish', {
    mutationFn: (id: string) =>
      apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACTIVE' }),
      }),
    onMutate: (id) => setPendingActionId(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: qk.myOpportunities(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: qk.myOpportunitiesDashboard(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: qk._root.opportunitiesFeed })
      queryClient.invalidateQueries({ queryKey: qk._root.explore })
      queryClient.invalidateQueries({ queryKey: qk._root.opportunities })
      // Distinct query key from the _root.opportunities prefixes above — the
      // detail page's own cache was previously never invalidated from here,
      // so it kept showing the pre-publish status if already cached.
      queryClient.invalidateQueries({ queryKey: qk.opportunity(id) })
      toast.success('Publiée ! Votre opportunité est maintenant visible par la communauté.')
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de publier l\'opportunité.')),
    onSettled: () => setPendingActionId(null),
  })

  const archiveMutation = useTrackedMutation('opportunity.archive', {
    mutationFn: (id: string) =>
      apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ARCHIVED' }),
      }),
    onMutate: (id) => setPendingActionId(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: qk.myOpportunities(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: qk.myOpportunitiesDashboard(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: qk._root.opportunitiesFeed })
      queryClient.invalidateQueries({ queryKey: qk._root.explore })
      queryClient.invalidateQueries({ queryKey: qk._root.opportunities })
      queryClient.invalidateQueries({ queryKey: qk.opportunity(id) })
      toast.success('Opportunité archivée.')
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible d\'archiver l\'opportunité.')),
    onSettled: () => setPendingActionId(null),
  })

  const resubmitMutation = useTrackedMutation('opportunity.resubmit', {
    mutationFn: (id: string) =>
      apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACTIVE' }),
      }),
    onMutate: (id) => setPendingActionId(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: qk.myOpportunities(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: qk.myOpportunitiesDashboard(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: qk._root.opportunitiesFeed })
      queryClient.invalidateQueries({ queryKey: qk._root.explore })
      queryClient.invalidateQueries({ queryKey: qk._root.opportunities })
      queryClient.invalidateQueries({ queryKey: qk.opportunity(id) })
      toast.success('Publiée ! Votre opportunité est maintenant visible par la communauté.')
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de publier l\'opportunité.')),
    onSettled: () => setPendingActionId(null),
  })

  const filtered: Opportunity[] = (opportunities ?? []).filter((op) =>
    statusFilter === 'ALL' ? true : op.status === statusFilter
  )

  return (
    <AuthGuard skeleton={<MyOpportunitiesSkeleton />}>
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes opportunités</h1>
          <p className="text-sm text-gray-500">Gérez les opportunités que vous avez créées.</p>
        </div>
        <Link
          href="/opportunities/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm font-semibold hover:bg-[#2d3aba]"
        >
          <Plus className="w-4 h-4" />
          Créer
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
            {s === 'ALL' ? 'Tout' : STATUS_LABELS[s]}
            {s !== 'ALL' && opportunities && (
              <span className="ml-1 text-xs text-gray-400">
                ({opportunities.filter((o: Opportunity) => o.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Draft banner */}
      {opportunities?.some((o: Opportunity) => o.status === 'DRAFT') && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            Vous avez des <span className="font-semibold">brouillons</span>. Cliquez sur <Send className="inline w-3.5 h-3.5 mx-0.5" /> pour les publier — elles seront visibles immédiatement par la communauté.
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
              <Avatar src={opp.image} name={opp.name} square sizeClass="w-12 h-12" sizes="48px" />

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
                    Réviser
                  </Link>
                )}
                <Link
                  href={`/opportunities/${opp.id}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Voir"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/opportunities/${opp.id}/edit`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                {opp.status === 'DRAFT' && (
                  <button
                    onClick={() => publishMutation.mutate(opp.id)}
                    disabled={publishMutation.isPending || pendingActionId === opp.id}
                    title="Publier"
                    className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                {opp.status === 'ACTIVE' && (
                  <button
                    onClick={() => setConfirmArchive(opp.id)}
                    disabled={archiveMutation.isPending || pendingActionId === opp.id}
                    title="Archiver"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {opp.status === 'PENDING' && (
                  <button
                    onClick={() => publishMutation.mutate(opp.id)}
                    disabled={publishMutation.isPending || pendingActionId === opp.id}
                    title="Publier maintenant"
                    className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                {opp.status === 'ARCHIVED' && (
                  <button
                    onClick={() => resubmitMutation.mutate(opp.id)}
                    disabled={resubmitMutation.isPending || pendingActionId === opp.id}
                    title="Republier"
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
            ? "Vous n'avez pas encore créé d'opportunité."
            : `Aucune opportunité avec le statut « ${STATUS_LABELS[statusFilter]} ».`}
        </div>
      )}

      <ConfirmModal
        open={!!confirmArchive}
        title="Archiver cette opportunité ?"
        description="Elle ne sera plus visible par la communauté. Vous pourrez la resoumettre plus tard."
        confirmLabel="Archiver"
        cancelLabel="Garder active"
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
