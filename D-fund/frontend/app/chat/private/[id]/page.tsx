'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { ArrowLeft, Eye, UserPlus, Share2, Send } from 'lucide-react'
import Link from 'next/link'

export default function PrivateDiscussionPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params?.id as string
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: privateDiscussions } = useQuery({
    queryKey: ['private-discussions', user?.id],
    queryFn: () => apiJson('/messages/private'),
    enabled: !!user?.id,
  })

  const discussion = (privateDiscussions as any[])?.find((d: any) => d.id === id)
  const otherParticipant = discussion?.participants
    ?.filter((p: any) => p.userId !== user?.id)
    ?.[0]?.user || null

  const {
    data: messages,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['private-discussion-messages', id],
    queryFn: () => apiJson(`/messages/private/${id}`),
    enabled: !!id && !!user?.id,
    refetchInterval: 5000,
  })

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiJson(`/messages/private/${id}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-discussion-messages', id] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark discussion as read when opened
  useEffect(() => {
    if (!id || !user?.id) return
    apiJson(`/messages/private/${id}/read`, { method: 'POST' }).catch(() => {})
  }, [id, user?.id])

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
          Please sign in to view this conversation.
        </div>
      </div>
    )
  }

  const messageCount = (messages as any[])?.length ?? 0

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
        {otherParticipant?.name && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-semibold truncate max-w-[200px]">
              {otherParticipant.name}
            </span>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 480 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#3b49df] overflow-hidden flex-shrink-0">
              {otherParticipant?.profilePic ? (
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
              {messageCount > 0 && (
                <p className="text-[10px] font-semibold text-[#3b49df] uppercase tracking-wider mb-0.5">
                  {messageCount} Message{messageCount > 1 ? 's' : ''}
                </p>
              )}
              <h1 className="text-base font-bold text-gray-900">
                {otherParticipant?.name || 'Direct message'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="View profile"
              onClick={() => otherParticipant?.id && router.push(`/profiles/${otherParticipant.id}`)}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Add participant"
            >
              <UserPlus className="w-4 h-4" />
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className={`h-10 bg-gray-100 rounded-2xl animate-pulse ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(error as Error)?.message || 'Unable to load this conversation.'}
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {!messages || (messages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    {otherParticipant?.profilePic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={otherParticipant.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-base font-semibold text-[#3b49df]">
                        {otherParticipant?.name?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-600">{otherParticipant?.name || 'User'}</p>
                  <p className="text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                (messages as any[]).map((m) => {
                  const isOwn = m.senderId === user.id
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
      </div>
    </div>
  )
}
