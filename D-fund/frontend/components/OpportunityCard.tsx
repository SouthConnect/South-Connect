'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import type { Opportunity } from '@/app/lib/types'
import { ThumbsUp, MessageSquare, Bookmark, Users, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface OpportunityCardProps {
  opportunity: Opportunity
}

const TYPE_COLORS: Record<string, string> = {
  JOB_OPPORTUNITY: 'text-blue-600 bg-blue-50',
  TALENT_PROFILE: 'text-violet-600 bg-violet-50',
  CO_FOUNDER_OPPORTUNITY: 'text-orange-600 bg-orange-50',
  CO_FOUNDER_PROFILE: 'text-orange-600 bg-orange-50',
  BUSINESS_IDEA: 'text-amber-600 bg-amber-50',
  SUPPORT_OFFER: 'text-green-600 bg-green-50',
  SERVICE_LISTING: 'text-teal-600 bg-teal-50',
  SERVICE_REQUEST: 'text-teal-600 bg-teal-50',
  DEAL_FLOW: 'text-cyan-600 bg-cyan-50',
  INVESTOR_THESIS: 'text-indigo-600 bg-indigo-50',
  INVESTOR_PROFILE: 'text-indigo-600 bg-indigo-50',
  FUNDING_OPPORTUNITY: 'text-green-700 bg-green-50',
  EVENT: 'text-pink-600 bg-pink-50',
  CALL_FOR_STARTUPS: 'text-red-600 bg-red-50',
  MENTORSHIP_BA_OFFER: 'text-purple-600 bg-purple-50',
  PROJECT_SEEKING_SUPPORT: 'text-sky-600 bg-sky-50',
  VENTURE_PROGRAM: 'text-emerald-600 bg-emerald-50',
  CHILL_WORK_SPOT: 'text-lime-600 bg-lime-50',
  MARKET_ADVISOR: 'text-rose-600 bg-rose-50',
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Local optimistic state — overrides the prop values while a mutation is in
  // flight or just after it settles. This decouples the visual feedback from the
  // React Query list cache (which is not updated during card-level mutations).
  const serverIsLiked = !!opportunity.isLiked
  const serverIsSaved = !!opportunity.isSaved
  const [localLiked, setLocalLiked] = useState<boolean | null>(null)
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null)
  const [localSaved, setLocalSaved] = useState<boolean | null>(null)
  const [localSaveCount, setLocalSaveCount] = useState<number | null>(null)

  const displayIsLiked  = localLiked     ?? serverIsLiked
  const displayLikeCount = localLikeCount ?? (opportunity.likesCount ?? 0)
  const displayIsSaved  = localSaved     ?? serverIsSaved
  const displaySaveCount = localSaveCount ?? (opportunity.savedCount ?? 0)

  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  const typeColor = TYPE_COLORS[opportunity.type] ?? 'text-[#3b49df] bg-[#3b49df]/5'
  const typeLabel = opportunity.type.replace(/_/g, ' ')

  const toggleLikeMutation = useMutation({
    mutationFn: (currentlyLiked: boolean) =>
      apiJson(`/social/like/${opportunity.id}`, { method: currentlyLiked ? 'DELETE' : 'POST' }),
    onMutate: (currentlyLiked) => {
      setLocalLiked(!currentlyLiked)
      setLocalLikeCount((opportunity.likesCount ?? 0) + (currentlyLiked ? -1 : 1))
    },
    onError: () => {
      // Roll back to server values
      setLocalLiked(null)
      setLocalLikeCount(null)
      toast.error('Impossible de mettre à jour le like')
    },
    onSettled: () => {
      // Let the server state win — reset locals so the next render uses fresh props
      setLocalLiked(null)
      setLocalLikeCount(null)
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunity.id] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })

  const toggleSaveMutation = useMutation({
    mutationFn: (currentlySaved: boolean) =>
      apiJson(`/social/save/${opportunity.id}`, { method: currentlySaved ? 'DELETE' : 'POST' }),
    onMutate: (currentlySaved) => {
      setLocalSaved(!currentlySaved)
      setLocalSaveCount((opportunity.savedCount ?? 0) + (currentlySaved ? -1 : 1))
    },
    onError: () => {
      setLocalSaved(null)
      setLocalSaveCount(null)
      toast.error('Impossible de mettre à jour l\'enregistrement')
    },
    onSettled: () => {
      setLocalSaved(null)
      setLocalSaveCount(null)
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunity.id] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['saved-opportunities'] })
    },
  })

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    toggleLikeMutation.mutate(displayIsLiked)
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    toggleSaveMutation.mutate(displayIsSaved)
  }

  return (
    <Link href={`/opportunities/${opportunity.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-md hover:border-gray-200 transition-all group">
        <div className="flex gap-3 items-start">
          {/* Thumbnail */}
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden mt-0.5">
            {opportunity.image ? (
              <img src={opportunity.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3b49df]/10 to-[#3b49df]/20">
                <span className="text-lg font-bold text-[#3b49df]/40">
                  {opportunity.name?.[0] ?? '?'}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-1 ${typeColor}`}>
              {typeLabel}
            </span>

            <h3 className="text-[15px] font-bold text-gray-900 leading-snug truncate group-hover:text-[#3b49df] transition-colors">
              {opportunity.name}
            </h3>

            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {opportunity.owner?.name} · {date}
            </div>
          </div>

          {/* Right: price + stats */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
            {/* Price */}
            {opportunity.price ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-[#3b49df]">
                <DollarSign className="w-3.5 h-3.5" />
                {opportunity.price.toLocaleString()}
              </div>
            ) : null}

            {/* Stats row */}
            <div className="flex items-center gap-3 text-gray-400">
              <button
                onClick={handleLikeClick}
                disabled={toggleLikeMutation.isPending}
                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${displayIsLiked ? 'text-[#3b49df]' : 'hover:text-[#3b49df]'}`}
                title="J'aime"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${displayIsLiked ? 'fill-[#3b49df]' : ''}`} />
                <span>{displayLikeCount}</span>
              </button>

              <span className="flex items-center gap-1 text-xs" title="Messages">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{opportunity.messagesCount ?? 0}</span>
              </span>

              <span className="flex items-center gap-1 text-xs" title="Candidatures">
                <Users className="w-3.5 h-3.5" />
                <span>{opportunity.applicationsCount}</span>
              </span>

              <button
                onClick={handleSaveClick}
                disabled={toggleSaveMutation.isPending}
                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${displayIsSaved ? 'text-[#3b49df]' : 'hover:text-[#3b49df]'}`}
                title="Enregistrer"
              >
                <Bookmark className={`w-3.5 h-3.5 ${displayIsSaved ? 'fill-[#3b49df]' : ''}`} />
                <span>{displaySaveCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
