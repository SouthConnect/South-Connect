'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { useSocket } from '@/app/hooks/useSocket'
import { ArrowLeft, Send, Eye } from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'
import { toast } from 'sonner'
import type { PrivateDiscussion, Message } from '@/app/lib/types'

// ── helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// ── component ─────────────────────────────────────────────────────────────────

export default function PrivateDiscussionPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params?.id as string
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const socket = useSocket()

  const [content, setContent] = useState('')
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({})
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── fetch discussion metadata ──────────────────────────────────────────────
  const { data: privateDiscussions } = useQuery({
    queryKey: ['private-discussions', user?.id],
    queryFn: () => apiJson('/messages/private'),
    enabled: !!user?.id,
  })
  const discussion = (privateDiscussions as PrivateDiscussion[] | undefined)?.find((d) => d.id === id)
  const otherParticipant = discussion?.participants?.find((p) => p.userId !== user?.id)?.user ?? null

  // ── fetch messages ─────────────────────────────────────────────────────────
  const { data: messages, isLoading, isError } = useQuery({
    queryKey: ['private-discussion-messages', id],
    queryFn: () => apiJson<Message[]>(`/messages/private/${id}`),
    enabled: !!id && !!user?.id,
    // Pas de refetchInterval : le socket gère le temps réel
    staleTime: Infinity,
  })

  // ── send mutation ──────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: ({ text, clientMessageId }: { text: string; clientMessageId: string }) =>
      apiJson(`/messages/private/${id}`, {
        method: 'POST',
        body: JSON.stringify({ content: text, clientMessageId }),
      }),
    onSuccess: () => {
      // Le socket va broadcaster et mettre à jour le cache
      queryClient.invalidateQueries({ queryKey: ['private-discussions', user?.id] })
    },
    onError: (err: any) => toast.error(err.message || 'Impossible d\'envoyer le message.'),
  })

  // ── socket : rejoindre la room + écouter les events ───────────────────────
  useEffect(() => {
    if (!socket || !id) return
    socket.emit('join', id)

    const handleNewMessage = (msg: Message) => {
      queryClient.setQueryData(['private-discussion-messages', id], (old: Message[] | undefined) => {
        if (!old) return [msg]
        // Éviter les doublons (ex: expéditeur reçoit aussi l'event)
        if (old.some((m) => m.id === msg.id)) return old
        return [...old, msg]
      })
      // Marquer comme lu si on est dans la conversation
      apiJson(`/messages/private/${id}/read`, { method: 'POST' }).catch(() => {})
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

    socket.on('newMessage', handleNewMessage)
    socket.on('typing', handleTyping)
    socket.on('stopTyping', handleStopTyping)

    return () => {
      socket.emit('leave', id)
      socket.off('newMessage', handleNewMessage)
      socket.off('typing', handleTyping)
      socket.off('stopTyping', handleStopTyping)
    }
  }, [socket, id, user?.id, queryClient])

  // ── auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // ── mark as read on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !user?.id) return
    apiJson(`/messages/private/${id}/read`, { method: 'POST' }).catch(() => {})
  }, [id, user?.id])

  // ── cleanup typing timer on unmount to prevent zombie socket.emit calls ───
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [])

  // ── typing indicator ───────────────────────────────────────────────────────
  const handleTypingInput = useCallback(() => {
    if (!socket || !user) return
    socket.emit('typing', { discussionId: id, name: user.name || user.email })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('stopTyping', id)
    }, 2000)
  }, [socket, id, user])

  // ── send ───────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = content.trim()
    if (!text || mutation.isPending) return
    mutation.mutate({ text, clientMessageId: crypto.randomUUID() })
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    if (socket) socket.emit('stopTyping', id)
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }

  const msgs: Message[] = messages ?? []
  const typingNames = Object.values(typingUsers)

  return (
    <AuthGuard message="Connectez-vous pour accéder à cette conversation.">
    <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen max-h-screen">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => router.push('/chat')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#3b49df] overflow-hidden shrink-0">
          {otherParticipant?.profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherParticipant.profilePic} alt="" className="w-full h-full object-cover" />
          ) : (
            otherParticipant?.name?.[0] || 'U'
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {otherParticipant?.name || 'Message direct'}
          </p>
          <p className="text-xs text-gray-400">
            {typingNames.length > 0
              ? `${typingNames.join(', ')} est en train d'écrire…`
              : 'Message privé'}
          </p>
        </div>

        {otherParticipant?.id && (
          <button
            type="button"
            onClick={() => router.push(`/profiles/${otherParticipant.id}`)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title="Voir le profil"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
        {isLoading && (
          <div className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 3 === 2 ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className={`h-9 rounded-2xl bg-gray-200 animate-pulse ${i % 3 === 2 ? 'w-40' : 'w-52'}`} />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-8 text-sm text-red-500">
            Impossible de charger la conversation.
          </div>
        )}

        {!isLoading && !isError && msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-xl font-bold text-[#3b49df] mb-3 overflow-hidden">
              {otherParticipant?.profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={otherParticipant.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                otherParticipant?.name?.[0] || 'U'
              )}
            </div>
            <p className="font-semibold text-gray-700">{otherParticipant?.name}</p>
            <p className="text-xs text-gray-400 mt-1">Commencez la conversation !</p>
          </div>
        )}

        {!isLoading && !isError && msgs.length > 0 && (
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
                  {/* Séparateur de jour */}
                  {showDay && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {formatDay(m.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${sameAsPrev ? 'mt-0.5' : 'mt-3'}`}>
                    {/* Avatar — affiché uniquement pour le dernier message du groupe */}
                    {!isOwn && (
                      <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 ${sameAsNext ? 'invisible' : ''}`}>
                        {m.sender?.profilePic ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.sender.profilePic} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-[#3b49df]">
                            {m.sender?.name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {/* Nom + date — seulement sur le premier du groupe */}
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

                      {/* Heure — seulement sur le dernier du groupe */}
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

            {/* Indicateur de frappe */}
            {typingNames.length > 0 && (
              <div className="flex items-end gap-2 mt-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                  {otherParticipant?.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={otherParticipant.profilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#3b49df]">
                      {otherParticipant?.name?.[0] || 'U'}
                    </div>
                  )}
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

      {/* ── Input ── */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              handleTypingInput()
              // Auto-resize
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
      </div>
    </div>
    </AuthGuard>
  )
}
