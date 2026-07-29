'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { useSocket } from '@/app/hooks/useSocket'
import { ArrowLeft, Users, Send } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import type { PublicDiscussion, Message } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function PublicDiscussionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const socket = useSocket()

  const [content, setContent] = useState('')
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({})
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Metadata de la discussion
  const { data: allDiscussions } = useQuery({
    queryKey: qk.publicDiscussionsAll(),
    queryFn: () => apiJson('/messages/public'),
  })
  const discussion = (allDiscussions as PublicDiscussion[] | undefined)?.find((d) => d.id === id)
  const title = discussion?.title || discussion?.opportunity?.name || 'Discussion publique'
  const membersCount = discussion?.membersCount ?? 0

  // Messages
  const { data: messages, isLoading, isError } = useQuery({
    queryKey: qk.publicDiscussionMessages(id),
    queryFn: () => apiJson<Message[]>(`/messages/public/${id}`),
    enabled: !!id,
    staleTime: Infinity,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })

  // Envoi
  const mutation = useTrackedMutation('message.send', {
    mutationFn: ({ text, clientMessageId }: { text: string; clientMessageId: string }) =>
      apiJson(`/messages/public/${id}`, {
        method: 'POST',
        body: JSON.stringify({ content: text, clientMessageId }),
      }),
    onMutate: async ({ text, clientMessageId }) => {
      const key = qk.publicDiscussionMessages(id)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Message[]>(key)
      const optimistic: Message = {
        id: clientMessageId,
        content: text,
        createdAt: new Date().toISOString(),
        senderId: user?.id ?? '',
        sender: user ? { id: user.id, name: user.name, profilePic: user.profilePic } : undefined,
        clientMessageId,
      }
      queryClient.setQueryData<Message[]>(key, (old) =>
        old ? [...old, optimistic] : [optimistic],
      )
      return { prev }
    },
    onError: (err: unknown, __, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(qk.publicDiscussionMessages(id), ctx.prev)
      toast.error(getErrorMessage(err, 'Impossible d\'envoyer le message.'))
    },
  })

  // Socket
  useEffect(() => {
    if (!socket || !id) return
    socket.emit('join', id)

    const handleNewMessage = (msg: Message) => {
      queryClient.setQueryData<Message[]>(qk.publicDiscussionMessages(id), (old) => {
        if (!old) return [msg]
        if (msg.clientMessageId && old.some((m) => m.id === msg.clientMessageId)) {
          return old.map((m) => m.id === msg.clientMessageId ? msg : m)
        }
        if (old.some((m) => m.id === msg.id)) return old
        return [...old, msg]
      })
    }

    const handleTyping = ({ userId, name }: { userId: string; name: string }) => {
      if (userId === user?.id) return
      setTypingUsers((prev) => ({ ...prev, [userId]: name }))
    }

    const handleStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }

    // Room membership is per Socket.IO connection instance — a reconnection
    // (network blip, laptop wake) gets a fresh server-side socket and loses
    // it silently. Without re-joining here, messages sent while "reconnected"
    // never reach this client until the page is remounted. Also refetch this
    // conversation's messages to catch anything sent during the gap between
    // disconnect and this re-join (targeted — only this open conversation,
    // not every cached discussion; see SocketContext.tsx's own reconnect
    // handler).
    //
    // Note: `reconnect` is a Manager-level event — it must be listened for on
    // `socket.io`, not `socket` itself (socket.io-client only forwards
    // open/packet/error/close from the Manager onto the Socket instance;
    // `socket.on('reconnect', ...)` never fires). See SocketContext.tsx for
    // the full explanation.
    const handleReconnect = () => {
      socket.emit('join', id)
      queryClient.invalidateQueries({ queryKey: qk.publicDiscussionMessages(id) })
    }

    socket.on('newMessage', handleNewMessage)
    socket.on('typing', handleTyping)
    socket.on('stopTyping', handleStopTyping)
    socket.io.on('reconnect', handleReconnect)

    return () => {
      socket.emit('leave', id)
      socket.off('newMessage', handleNewMessage)
      socket.off('typing', handleTyping)
      socket.off('stopTyping', handleStopTyping)
      socket.io.off('reconnect', handleReconnect)
    }
  }, [socket, id, user?.id, queryClient])

  useEffect(() => {
    return () => { if (typingTimer.current) clearTimeout(typingTimer.current) }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  const handleTypingInput = useCallback(() => {
    if (!socket || !user) return
    socket.emit('typing', { discussionId: id, name: user.name || user.email })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socket.emit('stopTyping', id), 2000)
  }, [socket, id, user])

  const handleSend = () => {
    const text = content.trim()
    if (!text || mutation.isPending) return
    mutation.mutate({ text, clientMessageId: crypto.randomUUID() })
    setContent('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    if (socket) socket.emit('stopTyping', id)
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }

  const msgs: Message[] = messages ?? []
  const typingNames = Object.values(typingUsers)

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen max-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => router.push('/chat')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 relative">
          {discussion?.opportunity?.image ? (
            <Image src={discussion.opportunity.image} alt="" fill className="object-cover" sizes="64px" />
          ) : (
            <span className="text-sm font-bold text-[#3b49df]">{title?.[0] || 'D'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
            {typingNames.length > 0 ? (
              `${typingNames.join(', ')} est en train d'écrire…`
            ) : discussion?.description ? (
              <span className="truncate">{discussion.description}</span>
            ) : (
              <>
                <Users className="w-3 h-3" />
                {membersCount > 0 ? `${membersCount} membres` : 'Discussion publique'}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
        {isLoading && (
          <div className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="h-9 rounded-2xl bg-gray-200 animate-pulse w-52" />
              </div>
            ))}
          </div>
        )}

        {isError && msgs.length === 0 && (
          <div className="text-center py-8 text-sm text-red-500">
            Impossible de charger la discussion.
          </div>
        )}

        {!isLoading && msgs.length === 0 && !isError && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg font-bold text-[#3b49df] mb-3">
              {title?.[0] || 'D'}
            </div>
            <p className="font-semibold text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mt-1">
              {user ? 'Soyez le premier à écrire !' : 'Connectez-vous pour participer.'}
            </p>
          </div>
        )}

        {!isLoading && msgs.length > 0 && (
          <>
            {msgs.map((m, idx) => {
              const isOwn = m.senderId === user?.id
              const prev = msgs[idx - 1]
              const next = msgs[idx + 1]
              const showDay = !prev || !isSameDay(prev.createdAt, m.createdAt)
              const sameAsPrev = prev && prev.senderId === m.senderId && !showDay
              const sameAsNext = next && next.senderId === m.senderId && isSameDay(m.createdAt, next.createdAt)

              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {formatDay(m.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${sameAsPrev ? 'mt-0.5' : 'mt-3'}`}>
                    {!isOwn && (
                      <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 relative ${sameAsNext ? 'invisible' : ''}`}>
                        {m.sender?.profilePic ? (
                          <Image src={m.sender.profilePic} alt="" fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-[#3b49df]">
                            {m.sender?.name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!sameAsPrev && !isOwn && (
                        <span className="text-[10px] text-gray-400 font-semibold mb-0.5 px-1">
                          {m.sender?.name}
                        </span>
                      )}

                      <div
                        className={`px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed ${
                          isOwn
                            ? `bg-[#3b49df] text-white ${sameAsPrev ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-br-md'}`
                            : `bg-white text-gray-900 shadow-sm ${sameAsPrev ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-bl-md'}`
                        }`}
                      >
                        {m.content}
                      </div>

                      {!sameAsNext && (
                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                          {formatTime(m.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {typingNames.length > 0 && (
              <div className="flex items-end gap-2 mt-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-[10px] font-bold text-[#3b49df]">
                  ?
                </div>
                <div className="bg-white shadow-sm rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
        {user ? (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={content}
              maxLength={2000}
              onChange={(e) => {
                setContent(e.target.value)
                handleTypingInput()
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              rows={1}
              placeholder="Écrivez un message… (Entrée pour envoyer)"
              className="flex-1 px-4 py-2.5 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#3b49df] outline-none transition-all resize-none"
              style={{ maxHeight: 120, overflowY: 'auto' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!content.trim() || mutation.isPending}
              className="w-10 h-10 rounded-xl bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-40 shrink-0 transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-center text-gray-500">
            <Link href="/login" className="text-[#3b49df] font-semibold hover:underline">
              Connectez-vous
            </Link>{' '}
            pour participer à cette discussion.
          </p>
        )}
      </div>
    </div>
  )
}
