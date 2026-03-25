'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { ArrowLeft, Users, Share2, Send } from 'lucide-react'

export default function PublicDiscussionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch discussion metadata from the list
  const { data: allDiscussions } = useQuery({
    queryKey: ['public-discussions-all'],
    queryFn: () => apiJson('/messages/public'),
  })
  const discussion = (allDiscussions as any[])?.find((d: any) => d.id === id)

  const {
    data: messages,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['public-discussion-messages', id],
    queryFn: () => apiJson(`/messages/public/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  })

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiJson(`/messages/public/${id}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-discussion-messages', id] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const messageCount = (messages as any[])?.length ?? 0
  const title = discussion?.title || discussion?.opportunity?.name || 'Public discussion'
  const membersCount = discussion?.membersCount ?? discussion?.participants?.length ?? 0

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <button
          type="button"
          onClick={() => router.push('/chat')}
          className="hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-1" />
          Chat
        </button>
        {title && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-semibold truncate max-w-[200px]">
              {title}
            </span>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 480 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {discussion?.opportunity?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={discussion.opportunity.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-base font-bold text-[#3b49df]">
                  {title?.[0] || 'D'}
                </span>
              )}
            </div>
            <div>
              {messageCount > 0 && (
                <p className="text-[10px] font-semibold text-[#3b49df] uppercase tracking-wider mb-0.5">
                  {messageCount} Message{messageCount > 1 ? 's' : ''}
                </p>
              )}
              <h1 className="text-base font-bold text-gray-900">{title}</h1>
              {membersCount > 0 && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  {membersCount} members
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Members"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="h-10 bg-gray-100 rounded-2xl animate-pulse w-56" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(error as Error)?.message || 'Unable to load this discussion.'}
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {!messages || (messages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-400">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3 text-xl font-bold text-[#3b49df]">
                    {title?.[0] || 'D'}
                  </div>
                  <p className="font-semibold text-gray-600">{title}</p>
                  <p className="text-xs mt-1">Be the first to say something!</p>
                </div>
              ) : (
                (messages as any[]).map((m) => {
                  const isOwn = m.senderId === user?.id
                  const date = new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const fullDate = new Date(m.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isOwn && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-[#3b49df] overflow-hidden flex-shrink-0">
                          {m.sender?.profilePic ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.sender.profilePic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            m.sender?.name?.[0] || 'U'
                          )}
                        </div>
                      )}
                      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!isOwn && (
                          <span className="text-[10px] text-gray-500 font-semibold px-1">
                            {m.sender?.name} · {fullDate}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                            isOwn
                              ? 'bg-[#3b49df] text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">{date}</span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        {user ? (
          <form
            className="border-t border-gray-100 px-4 py-3 flex gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const content = (formData.get('content') as string)?.trim()
              if (!content) return
              mutation.mutate(content)
              e.currentTarget.reset()
            }}
          >
            <input
              name="content"
              placeholder="Écrivez quelque chose..."
              autoComplete="off"
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50 flex-shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-500">
            <a href="/login" className="text-[#3b49df] font-semibold hover:underline">
              Sign in
            </a>{' '}
            to participate in this discussion.
          </div>
        )}
      </div>
    </div>
  )
}
