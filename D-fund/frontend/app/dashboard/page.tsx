'use client'

import { useState } from 'react'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import { stageLabel, stageColor } from '@/app/lib/stage-labels'
import {
  FileText,
  ArrowUpRight,
  Briefcase,
  ListChecks,
  MessageCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { toast } from 'sonner'
import type { PrivateDiscussion, Task } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'
import AuthGuard from '@/components/AuthGuard'

type DashboardTab = 'applications' | 'offers' | 'dm' | 'tasks'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  CLOSED: 'Fermée',
  ARCHIVED: 'Archivée',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<DashboardTab>('applications')

  const {
    data: applications,
    isLoading: isLoadingApplications,
  } = useQuery({
    queryKey: qk.myApplications(user?.id ?? ''),
    queryFn: () => apiJson(`/applications/user/${user?.id}`),
    enabled: !!user?.id && tab === 'applications',
    staleTime: 60_000,
  })

  const {
    data: myOppResponse,
    isLoading: isLoadingOpportunities,
  } = useQuery({
    queryKey: qk.myOpportunitiesDashboard(user?.id ?? ''),
    queryFn: () => apiJson<{ data: any[]; total: number; hasMore: boolean }>(`/opportunities/user/${user?.id}?take=10`),
    enabled: !!user?.id && tab === 'offers',
    staleTime: 60_000,
  })
  const myOpportunities = myOppResponse?.data

  const {
    data: privateDiscussions,
    isLoading: isLoadingDMs,
  } = useQuery({
    queryKey: qk.privateDiscussions(user?.id ?? ''),
    queryFn: () => apiJson('/messages/private'),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const totalApplications = applications?.length ?? 0
  const totalOffers = myOpportunities?.length ?? 0
  const discussions = (privateDiscussions as PrivateDiscussion[] | undefined)
  const totalDMs = discussions?.length ?? 0
  // unreadCount is now per-participant — find the current user's entry in each discussion
  const unreadDMs = discussions?.filter((d) =>
    (d.participants?.find((p) => p.userId === user?.id)?.unreadCount ?? 0) > 0
  ).length ?? 0

  return (
    <AuthGuard>
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenue{user ? `, ${user.name}` : ''}
          </h1>
          <p className="text-sm text-gray-500">
            Suivez vos candidatures, offres et tâches en un seul endroit.
          </p>
        </div>
        <Link
          href="/referral"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          Guide &amp; Earn
        </Link>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <DashboardCard
          title="Explorer les opportunités"
          description="Découvrez des emplois, investissements, partenariats et plus encore."
          cta="Explorer"
          href="/"
        />
        <DashboardCard
          title="Créer une opportunité"
          description="Publiez un emploi, tour de financement, événement ou toute offre pour toucher l'écosystème."
          cta="Créer"
          href="/opportunities/new"
        />
        <DashboardCard
          title="Se connecter avec les membres"
          description="Trouvez des talents, investisseurs et co-fondateurs. Envoyez-leur un message."
          cta="Découvrir"
          href="/community"
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4 text-sm border-b border-gray-200">
            <button
              type="button"
              onClick={() => setTab('applications')}
              className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                tab === 'applications'
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Applications
              <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">
                {totalApplications}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('offers')}
              className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                tab === 'offers'
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Offres
              <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">
                {totalOffers}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('dm')}
              className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                tab === 'dm'
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              DM
              {unreadDMs > 0 && (
                <span className="text-[10px] bg-[#3b49df] text-white rounded-full px-1.5 py-0.5">
                  {unreadDMs}
                </span>
              )}
              {unreadDMs === 0 && (
                <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">
                  {totalDMs}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('tasks')}
              className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                tab === 'tasks'
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Tâches
            </button>
          </div>
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-[#3b49df] hover:text-[#2d3aba]"
          >
            Explorer les opportunités
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {tab === 'applications' && (
          <ApplicationsSection
            applications={applications}
            isLoading={isLoadingApplications}
          />
        )}

        {tab === 'offers' && (
          <OffersSection
            opportunities={myOpportunities}
            isLoading={isLoadingOpportunities}
          />
        )}

        {tab === 'dm' && (
          <DMSection
            discussions={discussions}
            currentUserId={user?.id}
            isLoading={isLoadingDMs}
          />
        )}

        {tab === 'tasks' && <TasksSection />}
      </section>
    </div>
    </AuthGuard>
  )
}

function DashboardCard({
  title,
  description,
  cta,
  href,
}: {
  title: string
  description: string
  cta: string
  href?: string
}) {
  const content = (
    <div className="h-full flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-sm transition-shadow">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="mt-4">
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold bg-[#3b49df] text-white hover:bg-[#2d3aba]">
          {cta}
        </span>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    )
  }

  return content
}

function ApplicationsSection({
  applications,
  isLoading,
}: {
  applications: any[] | undefined
  isLoading: boolean
}) {
  const [subFilter, setSubFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'OWNER_REVIEW'>('ALL')

  const filtered = applications?.filter((app: any) => {
    if (subFilter === 'ALL') return true
    return app.stage === subFilter
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-xs font-semibold mb-2">
        {(['ALL', 'DRAFT', 'SUBMITTED', 'OWNER_REVIEW'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubFilter(s)}
            className={`px-3 py-1 rounded-full border transition-colors ${
              subFilter === s
                ? 'border-[#3b49df] bg-[#3b49df]/5 text-[#3b49df]'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {s === 'ALL' ? 'Tout' : s === 'OWNER_REVIEW' ? 'En révision' : s === 'DRAFT' ? 'Brouillon' : s === 'SUBMITTED' ? 'Soumise' : s}
            {s !== 'ALL' && (
              <span className="ml-1 text-[10px] text-gray-400">
                {applications?.filter((a: any) => a.stage === s).length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))
      ) : filtered && filtered.length > 0 ? (
        filtered.map((app: any) => (
          <div
            key={app.id}
            className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
          >
            <div className="flex flex-col">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 inline-flex ${stageColor(app.stage)}`}>
                {stageLabel(app.stage)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {app.opportunity?.name || 'Opportunité sans titre'}
              </span>
              <span className="text-xs text-gray-500">
                {app.title || 'Sans titre'} •{' '}
                {app.submissionDate
                  ? new Date(app.submissionDate).toLocaleDateString('fr-FR')
                  : 'Brouillon'}
              </span>
            </div>
            <Link
              href={`/applications/${app.id}`}
              className="text-xs font-semibold text-[#3b49df] hover:text-[#2d3aba]"
            >
              {app.stage === 'DRAFT' ? 'Modifier' : 'Voir'}
            </Link>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-200">
          {subFilter === 'ALL'
            ? 'Aucune candidature. Commencez par postuler à une opportunité.'
            : subFilter === 'OWNER_REVIEW'
              ? 'Aucune candidature en cours de révision.'
              : subFilter === 'DRAFT'
                ? 'Aucun brouillon de candidature.'
                : 'Aucune candidature soumise.'}
        </div>
      )}
    </div>
  )
}

function OffersSection({
  opportunities,
  isLoading,
}: {
  opportunities: any[] | undefined
  isLoading: boolean
}) {
  return (
    <div className="space-y-3">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))
      ) : opportunities && opportunities.length > 0 ? (
        opportunities.map((op: any) => (
          <Link
            key={op.id}
            href={`/opportunities/${op.id}`}
            className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-400 uppercase mb-1">
                {STATUS_LABELS[op.status] ?? op.status}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {op.name}
              </span>
              <span className="text-xs text-gray-500">
                {op.applicationsCount ?? 0} applications •{' '}
                {op.likesCount ?? 0} likes
              </span>
            </div>
          </Link>
        ))
      ) : (
        <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-200">
          Vous n'avez pas encore créé d'opportunité.
        </div>
      )}
    </div>
  )
}

function DMSection({
  discussions,
  currentUserId,
  isLoading,
}: {
  discussions: PrivateDiscussion[] | undefined
  currentUserId?: string
  isLoading: boolean
}) {
  return (
    <div className="space-y-3">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))
      ) : discussions && discussions.length > 0 ? (
        <>
          {discussions.map((d) => {
            const date = d.lastMessageAt
              ? new Date(d.lastMessageAt).toLocaleDateString('fr-FR')
              : null
            const other = d.participants?.find((p) => p.userId !== currentUserId)?.user || null
            const myUnread = d.participants?.find((p) => p.userId === currentUserId)?.unreadCount ?? 0
            const hasUnread = myUnread > 0

            return (
              <Link
                key={d.id}
                href={`/chat/private/${d.id}`}
                className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <Avatar src={other?.profilePic} name={other?.name} sizes="64px" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {other?.name || 'Message direct'}
                    </span>
                    {date && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{date}</span>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="text-xs text-[#3b49df] font-semibold">
                      {myUnread} message{myUnread > 1 ? 's' : ''} non lu{myUnread > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {hasUnread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3b49df] flex-shrink-0" />
                )}
              </Link>
            )
          })}
          <div className="text-center pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#3b49df] hover:underline"
            >
              Voir toutes les conversations
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-200">
          Aucune conversation pour l'instant.{' '}
          <Link href="/community" className="text-[#3b49df] font-semibold hover:underline">
            Découvrir des membres
          </Link>{' '}
          et commencer à discuter.
        </div>
      )}
    </div>
  )
}

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  WORKING_ON_IT: 'En cours',
  IDEA: 'Idée',
  DONE: 'Terminé',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  WORKING_ON_IT: 'bg-blue-50 text-blue-600',
  IDEA: 'bg-yellow-50 text-yellow-600',
  DONE: 'bg-green-50 text-green-600',
}

function TasksSection() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedOppId, setSelectedOppId] = useState('')

  const { data: tasks, isLoading } = useQuery({
    queryKey: qk.tasks(user?.id ?? ''),
    queryFn: () => apiJson('/tasks'),
    enabled: !!user?.id,
  })

  // Clé distincte pour ne pas entrer en conflit avec le take=10 du dashboard
  const { data: myOppsResponse } = useQuery({
    queryKey: qk.myOpportunitiesTasks(user?.id ?? ''),
    queryFn: () => apiJson<{ data: any[]; total: number; hasMore: boolean }>(`/opportunities/user/${user?.id}?take=100`),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
  const myOpps = myOppsResponse?.data ?? []

  const activeOpps = myOpps.filter((o: any) =>
    ['ACTIVE', 'DRAFT'].includes(o.status)
  )

  // Build a lookup map for resolving relatedItemId → opportunity name in task rows
  const oppMap = Object.fromEntries(
    myOpps.map((o: any) => [o.id, o.name])
  )

  const createMutation = useTrackedMutation('task.create', {
    mutationFn: (payload: { name: string; relatedItemId?: string; relatedItemType?: string }) =>
      apiJson<Task>('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks(user?.id ?? '') })
      setSelectedOppId('')
      toast.success('Tâche ajoutée !')
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de créer la tâche.')),
  })

  const updateStatusMutation = useTrackedMutation('task.updateStatus', {
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiJson<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.tasks(user?.id ?? '') }),
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de mettre à jour la tâche.')),
  })

  const deleteMutation = useTrackedMutation('task.delete', {
    mutationFn: (id: string) => apiJson<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.tasks(user?.id ?? '') }),
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de supprimer la tâche.')),
  })

  return (
    <div className="space-y-3">
      {/* Quick add */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const name = (new FormData(e.currentTarget).get('name') as string)?.trim()
          if (!name) { toast.error('Écris le nom de la tâche d\'abord.'); return }
          createMutation.mutate({
            name,
            ...(selectedOppId ? { relatedItemId: selectedOppId, relatedItemType: 'opportunity' } : {}),
          })
          e.currentTarget.reset()
        }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          <input
            name="name"
            placeholder="Ajouter une tâche…"
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-[#3b49df] text-white rounded-lg text-xs font-semibold hover:bg-[#2d3aba] disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
        {activeOpps.length > 0 && (
          <select
            value={selectedOppId}
            onChange={(e) => setSelectedOppId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none"
          >
            <option value="">Lier à une opportunité (optionnel)</option>
            {activeOpps.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </form>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))
      ) : tasks && (tasks as Task[]).length > 0 ? (
        (tasks as Task[]).map((task) => (
          <div
            key={task.id}
            className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={task.status === 'DONE'}
                onChange={() =>
                  updateStatusMutation.mutate({
                    id: task.id,
                    status: task.status === 'DONE' ? 'TODO' : 'DONE',
                  })
                }
                className="rounded border-gray-300 text-[#3b49df] focus:ring-[#3b49df]"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium block truncate ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.name}
                </span>
                {task.relatedItemId && task.relatedItemType === 'opportunity' && oppMap[task.relatedItemId] && (
                  <Link
                    href={`/opportunities/${task.relatedItemId}`}
                    className="text-[10px] text-[#3b49df] hover:underline truncate block"
                  >
                    {oppMap[task.relatedItemId]}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={task.status}
                onChange={(e) => updateStatusMutation.mutate({ id: task.id, status: e.target.value })}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-none focus:ring-1 focus:ring-[#3b49df] ${TASK_STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}
              >
                {Object.entries(TASK_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(task.id)}
                className="text-gray-300 hover:text-red-400 transition-colors text-xs"
              >
                &times;
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-200">
          Aucune tâche. Ajoutez-en une ci-dessus.
        </div>
      )}
    </div>
  )
}


