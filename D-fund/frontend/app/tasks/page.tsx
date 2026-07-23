'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import AuthGuard from '@/components/AuthGuard'
import { Plus, Trash2, ExternalLink, Check, Circle, Lightbulb, Loader2, X, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { Task, TaskStatus } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ElementType; ring: string; bg: string; text: string; dot: string }
> = {
  TODO: {
    label: 'À faire',
    icon: Circle,
    ring: 'border-gray-200',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
  WORKING_ON_IT: {
    label: 'En cours',
    icon: Loader2,
    ring: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  IDEA: {
    label: 'Idées',
    icon: Lightbulb,
    ring: 'border-yellow-200',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
  },
  DONE: {
    label: 'Terminé',
    icon: Check,
    ring: 'border-green-200',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
}

const STATUS_ORDER: TaskStatus[] = ['TODO', 'WORKING_ON_IT', 'IDEA', 'DONE']

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  TODO: 'WORKING_ON_IT',
  WORKING_ON_IT: 'DONE',
  IDEA: 'TODO',
  DONE: 'TODO',
}

export default function TasksPage() {
  return (
    <AuthGuard>
      <TasksContent />
    </AuthGuard>
  )
}

function TasksContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL')

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: qk.tasks(user?.id ?? ''),
    queryFn: () => apiJson('/tasks'),
    enabled: !!user?.id,
  })

  const createMutation = useTrackedMutation('task.create', {
    mutationFn: (dto: Partial<Task>) => apiJson('/tasks', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks(user?.id ?? '') })
      setShowAdd(false)
      toast.success('Tâche créée')
    },
    onError: (e: any) => toast.error(e.message || 'Impossible de créer la tâche.'),
  })

  const updateMutation = useTrackedMutation('task.update', {
    mutationFn: ({ id, ...dto }: Partial<Task> & { id: string }) =>
      apiJson(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks(user?.id ?? '') })
      setEditingId(null)
    },
    onError: (e: any) => toast.error(e.message || 'Impossible de mettre à jour la tâche.'),
  })

  const deleteMutation = useTrackedMutation('task.delete', {
    mutationFn: (id: string) => apiJson(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks(user?.id ?? '') })
      toast.success('Tâche supprimée')
    },
    onError: (e: any) => toast.error(e.message || 'Impossible de supprimer la tâche.'),
  })

  const visibleTasks =
    filterStatus === 'ALL' ? tasks : tasks.filter((t) => t.status === filterStatus)

  const grouped = STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>(
    (acc, s) => {
      acc[s] = visibleTasks.filter((t) => t.status === s)
      return acc
    },
    { TODO: [], WORKING_ON_IT: [], IDEA: [], DONE: [] },
  )

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s).length
    return acc
  }, {})

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes tâches</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3b49df] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3aba] transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          Nouvelle tâche
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        <FilterTab
          active={filterStatus === 'ALL'}
          onClick={() => setFilterStatus('ALL')}
          label="Toutes"
          count={tasks.length}
        />
        {STATUS_ORDER.map((s) => (
          <FilterTab
            key={s}
            active={filterStatus === s}
            onClick={() => setFilterStatus(s)}
            label={STATUS_CONFIG[s].label}
            count={counts[s]}
            dot={STATUS_CONFIG[s].dot}
          />
        ))}
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="mb-6">
          <TaskForm
            onSubmit={(dto) => createMutation.mutate(dto)}
            onCancel={() => setShowAdd(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && visibleTasks.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Circle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">
            {filterStatus === 'ALL' ? 'Aucune tâche. Créez-en une !' : `Aucune tâche "${STATUS_CONFIG[filterStatus]?.label}".`}
          </p>
        </div>
      )}

      {/* Task columns */}
      {!isLoading && visibleTasks.length > 0 && (
        <div className="space-y-8">
          {STATUS_ORDER.filter((s) => grouped[s].length > 0).map((status) => {
            const cfg = STATUS_CONFIG[status]
            const Icon = cfg.icon
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {grouped[status].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[status].map((task) =>
                    editingId === task.id ? (
                      <TaskForm
                        key={task.id}
                        initial={task}
                        onSubmit={(dto) => updateMutation.mutate({ id: task.id, ...dto })}
                        onCancel={() => setEditingId(null)}
                        isLoading={updateMutation.isPending}
                      />
                    ) : (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onAdvance={() =>
                          updateMutation.mutate({ id: task.id, status: NEXT_STATUS[task.status] })
                        }
                        onEdit={() => setEditingId(task.id)}
                        onDelete={() => {
                          if (confirm('Supprimer cette tâche ?')) deleteMutation.mutate(task.id)
                        }}
                        isAdvancing={updateMutation.isPending && updateMutation.variables?.id === task.id}
                      />
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  dot?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-[#3b49df] text-white'
          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : dot}`} />}
      {label}
      <span
        className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
          active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function TaskRow({
  task,
  onAdvance,
  onEdit,
  onDelete,
  isAdvancing,
}: {
  task: Task
  onAdvance: () => void
  onEdit: () => void
  onDelete: () => void
  isAdvancing: boolean
}) {
  const cfg = STATUS_CONFIG[task.status]
  const Icon = cfg.icon
  const isOverdue =
    task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < new Date()

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border ${cfg.ring} hover:shadow-sm transition-shadow group`}
    >
      {/* Advance button */}
      <button
        onClick={onAdvance}
        disabled={isAdvancing}
        title={task.status === 'DONE' ? 'Marquer comme À faire' : `Passer à "${STATUS_CONFIG[NEXT_STATUS[task.status]].label}"`}
        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.status === 'DONE'
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-[#3b49df] hover:bg-[#3b49df]/5 text-gray-300 hover:text-[#3b49df]'
        }`}
      >
        {isAdvancing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : task.status === 'DONE' ? (
          <Check className="w-3 h-3" />
        ) : (
          <Icon className="w-3 h-3" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div
          className={`text-sm font-medium truncate ${
            task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {task.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.description && (
            <span className="text-xs text-gray-400 truncate max-w-xs">{task.description}</span>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium ${
                isOverdue ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              {isOverdue && ' · en retard'}
            </span>
          )}
          {task.relatedItemType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              {task.relatedItemType}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function TaskForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: Task
  onSubmit: (dto: Partial<Task>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'TODO')
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.slice(0, 10) : '')
  const [url, setUrl] = useState(initial?.url ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      dueDate: dueDate || undefined,
      url: url.trim() || undefined,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#3b49df]/30 rounded-xl p-4 space-y-3 shadow-sm"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">
          {initial ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </span>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la tâche *"
        maxLength={200}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df]"
        required
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optionnelle)"
        rows={2}
        maxLength={5000}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df]"
      />

      <div className="flex gap-2 flex-wrap">
        {/* Status select */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-[#3b49df] bg-white"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>

        {/* Due date */}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-[#3b49df]"
        />

        {/* URL */}
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Lien (optionnel)"
          className="flex-1 min-w-[160px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-[#3b49df]"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-1.5 bg-[#3b49df] text-white text-xs font-semibold rounded-lg hover:bg-[#2d3aba] disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
