'use client'

import { MapPin, Users, ArrowUp, MessageSquare, Star, ThumbsUp, Bookmark } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'

interface OpportunityCardProps {
  opportunity: {
    id: string
    name: string
    type: string
    punchline?: string
    description?: string
    image?: string
    owner: {
      name: string
      profilePic?: string
    }
    createdAt: string
    price?: number
    currency?: string
    applicationsCount: number
    likesCount: number
    messagesCount: number
    savedCount: number
  }
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiJson(`/social/like/${opportunity.id}`, { method: 'POST' })
      } catch (error: any) {
        if (error?.message?.includes('already liked')) {
          await apiJson(`/social/like/${opportunity.id}`, { method: 'DELETE' })
        } else {
          throw error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunity.id] })
    },
  })

  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiJson(`/social/save/${opportunity.id}`, { method: 'POST' })
      } catch (error: any) {
        if (error?.message?.includes('already saved')) {
          await apiJson(`/social/save/${opportunity.id}`, { method: 'DELETE' })
        } else {
          throw error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunity.id] })
      queryClient.invalidateQueries({ queryKey: ['saved-opportunities'] })
    },
  })

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    toggleLikeMutation.mutate()
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    toggleSaveMutation.mutate()
  }

  return (
    <Link href={`/opportunities/${opportunity.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
            {opportunity.image ? (
              <img src={opportunity.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-[#3b49df] uppercase tracking-wider mb-1">
              {opportunity.type.replace(/_/g, ' ')}
            </div>
            <h3 className="text-xl font-bold text-gray-900 truncate mb-1">
              {opportunity.name}
            </h3>
            <div className="text-sm text-gray-500 mb-4">
              {opportunity.owner.name} • {date}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 whitespace-nowrap">
            {opportunity.price && (
              <div className="flex items-center gap-1 text-[#3b49df] font-bold">
                <Users className="w-4 h-4" />
                ${opportunity.price}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-auto">
              <button
                onClick={handleLikeClick}
                disabled={toggleLikeMutation.isPending}
                className="flex items-center gap-1 hover:text-[#3b49df] transition-colors disabled:opacity-50"
                title="Like"
              >
                <ThumbsUp className="w-4 h-4" />
                {opportunity.likesCount}
              </button>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {opportunity.messagesCount}
              </div>
              <button
                onClick={handleSaveClick}
                disabled={toggleSaveMutation.isPending}
                className="flex items-center gap-1 hover:text-[#3b49df] transition-colors disabled:opacity-50"
                title="Save"
              >
                <Bookmark className="w-4 h-4" />
                {opportunity.savedCount}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
