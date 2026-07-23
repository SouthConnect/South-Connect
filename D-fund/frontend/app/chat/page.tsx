'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { useRouter } from 'next/navigation'
import {
  MessageCircle,
  Lock,
  Search,
  Clock,
  Plus,
  ThumbsUp,
  X,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import type { PublicDiscussion, PrivateDiscussion } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

type ChatMode = 'open' | 'private'
type OpenTab = 'opportunity' | 'forum'

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ChatMode>('open')
  const [openTab, setOpenTab] = useState<OpenTab>('opportunity')
  const [openSearch, setOpenSearch] = useState('')
  const [privateSearch, setPrivateSearch] = useState('')
  const [showNewForum, setShowNewForum] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const createForumMutation = useTrackedMutation('forum.create', {
    mutationFn: () =>
      apiJson('/messages/public', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() || undefined }),
      }),
    onSuccess: (discussion: Pick<PublicDiscussion, 'id'>) => {
      queryClient.invalidateQueries({ queryKey: qk.publicDiscussions('OPEN_FORUM') })
      setShowNewForum(false)
      setNewTitle('')
      setNewDescription('')
      if (discussion?.id) router.push(`/chat/public/${discussion.id}`)
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de créer la discussion.')),
  })

  const {
    data: opportunityDiscussions,
    isLoading: isLoadingOpportunityDiscussions,
    isError: isErrorOpportunityDiscussions,
  } = useQuery({
    queryKey: qk.publicDiscussions('OPPORTUNITY_RELATED'),
    queryFn: () => apiJson('/messages/public?type=OPPORTUNITY_RELATED'),
  })

  const {
    data: forumDiscussions,
    isLoading: isLoadingForumDiscussions,
    isError: isErrorForumDiscussions,
  } = useQuery({
    queryKey: qk.publicDiscussions('OPEN_FORUM'),
    queryFn: () => apiJson('/messages/public?type=OPEN_FORUM'),
  })

  const {
    data: privateDiscussions,
    isLoading: isLoadingPrivateDiscussions,
  } = useQuery({
    queryKey: qk.privateDiscussions(user?.id ?? ''),
    queryFn: () => apiJson('/messages/private'),
    enabled: !!user?.id,
  })

  const rawOpenDiscussions = openTab === 'opportunity' ? opportunityDiscussions : forumDiscussions
  const activeOpenDiscussions = openSearch
    ? (rawOpenDiscussions as PublicDiscussion[] | undefined)?.filter((d) =>
        d.title?.toLowerCase().includes(openSearch.toLowerCase())
      )
    : (rawOpenDiscussions as PublicDiscussion[] | undefined)

  const filteredPrivateDiscussions = privateSearch
    ? (privateDiscussions as PrivateDiscussion[] | undefined)?.filter((d) => {
        const other = d.participants?.find((p) => p.userId !== user?.id)?.user
        return other?.name?.toLowerCase().includes(privateSearch.toLowerCase())
      })
    : (privateDiscussions as PrivateDiscussion[] | undefined)

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <p className="text-sm text-gray-500">
            Rejoignez des discussions publiques ou continuez vos conversations privées.
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-4 border-b border-gray-200 text-sm">
        <button
          type="button"
          onClick={() => setMode('open')}
          className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
            mode === 'open'
              ? 'border-[#3b49df] text-[#3b49df]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Public
        </button>
        <button
          type="button"
          onClick={() => setMode('private')}
          className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
            mode === 'private'
              ? 'border-[#3b49df] text-[#3b49df]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Lock className="w-4 h-4" />
          Privé
        </button>
      </div>

      {mode === 'open' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => setOpenTab('opportunity')}
                className={`pb-2 border-b-2 font-semibold ${
                  openTab === 'opportunity'
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Liées aux opportunités
              </button>
              <button
                type="button"
                onClick={() => setOpenTab('forum')}
                className={`pb-2 border-b-2 font-semibold ${
                  openTab === 'forum'
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Forum ouvert
              </button>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={openSearch}
                onChange={(e) => setOpenSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-none text-sm focus:ring-2 focus:ring-[#3b49df]"
              />
            </div>
          </div>

          {openTab === 'forum' && user && (
            <div>
              {showNewForum ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Nouvelle discussion Forum ouvert</p>
                    <button onClick={() => setShowNewForum(false)}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                    placeholder="Titre de la discussion"
                    maxLength={200}
                  />
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] resize-none"
                    placeholder="Description (optionnelle)…"
                    maxLength={1000}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowNewForum(false)}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => createForumMutation.mutate()}
                      disabled={!newTitle.trim() || createForumMutation.isPending}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50"
                    >
                      {createForumMutation.isPending ? 'Création…' : 'Créer'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewForum(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#3b49df] text-[#3b49df] hover:bg-[#3b49df]/5 mb-2"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle discussion
                </button>
              )}
            </div>
          )}

          {(openTab === 'opportunity' ? isErrorOpportunityDiscussions : isErrorForumDiscussions) && (
            <p className="text-sm text-red-500 text-center py-4">Impossible de charger les discussions. Réessayez.</p>
          )}
          <DiscussionList
            discussions={activeOpenDiscussions}
            isLoading={
              openTab === 'opportunity'
                ? isLoadingOpportunityDiscussions
                : isLoadingForumDiscussions
            }
          />
        </div>
      )}

      {mode === 'private' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Messages directs</p>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={privateSearch}
                onChange={(e) => setPrivateSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-none text-sm focus:ring-2 focus:ring-[#3b49df]"
              />
            </div>
          </div>

          {user ? (
            <PrivateDiscussionList
              discussions={filteredPrivateDiscussions}
              isLoading={isLoadingPrivateDiscussions}
              currentUserId={user.id}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
              Connectez-vous pour accéder à vos conversations privées.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DiscussionList({
  discussions,
  isLoading,
}: {
  discussions: PublicDiscussion[] | undefined
  isLoading: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  // Track liked discussions for the current session (resets on refresh)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const toggleLike = useTrackedMutation('forum.like', {
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      apiJson(`/social/discussion/like/${id}`, { method: liked ? 'DELETE' : 'POST' }),
    onMutate: ({ id, liked }) => {
      setLikedIds((prev) => {
        const next = new Set(prev)
        liked ? next.delete(id) : next.add(id)
        return next
      })
    },
    onError: (_, { id, liked }) => {
      setLikedIds((prev) => {
        const next = new Set(prev)
        liked ? next.add(id) : next.delete(id)
        return next
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.publicDiscussions('OPEN_FORUM') })
      queryClient.invalidateQueries({ queryKey: qk.publicDiscussions('OPPORTUNITY_RELATED') })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
        Aucune discussion publique pour l'instant.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
      {discussions.map((d) => {
        const date = d.lastMessageAt
          ? new Date(d.lastMessageAt).toLocaleDateString('fr-FR')
          : null
        const members = d.membersCount ?? 0
        const liked = likedIds.has(d.id)
        const likes = (d.likesCount ?? 0) + (liked ? 1 : 0)

        return (
          <div key={d.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <Link
              href={`/chat/public/${d.id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-[#3b49df] overflow-hidden shrink-0 relative">
                {d.image ? (
                  <Image src={d.image} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  d.title?.[0] || 'D'
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {d.title}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {d.description
                    ? d.description
                    : members > 0
                      ? `${members} membres`
                      : 'Discussion publique'}
                  {d.opportunity?.name ? ` • ${d.opportunity.name}` : ''}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 ml-3">
              {date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {date}
                </span>
              )}
              {user && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    if (toggleLike.isPending) return
                    toggleLike.mutate({ id: d.id, liked })
                  }}
                  className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${liked ? 'text-[#3b49df]' : 'hover:text-[#3b49df]'}`}
                  title={liked ? 'Retirer le like' : 'Aimer cette discussion'}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-[#3b49df]' : ''}`} />
                  <span>{likes}</span>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PrivateDiscussionList({
  discussions,
  isLoading,
  currentUserId,
}: {
  discussions: PrivateDiscussion[] | undefined
  isLoading: boolean
  currentUserId?: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
        Aucune conversation privée pour le moment.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
      {discussions.map((d) => {
        const date = d.lastMessageAt
          ? new Date(d.lastMessageAt).toLocaleDateString('fr-FR')
          : null
        const otherParticipant =
          d.participants?.find((p) => p.userId !== currentUserId)?.user || null
        // unreadCount is now per-participant — read the current user's entry
        const myUnread = d.participants?.find((p) => p.userId === currentUserId)?.unreadCount ?? 0

        return (
          <Link
            key={d.id}
            href={`/chat/private/${d.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-[#3b49df] overflow-hidden">
                {otherParticipant?.profilePic && /^https:\/\//.test(otherParticipant.profilePic) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={otherParticipant.profilePic}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  otherParticipant?.name?.[0] || 'U'
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {otherParticipant?.name || 'Message direct'}
                </div>
                <div className="text-xs text-gray-500">
                  {myUnread > 0 ? `${myUnread} non lu${myUnread > 1 ? 's' : ''} · ` : ''}
                  {date || 'Aucun message'}
                </div>
              </div>
            </div>
            {myUnread > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#3b49df] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {myUnread > 9 ? '9+' : myUnread}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

