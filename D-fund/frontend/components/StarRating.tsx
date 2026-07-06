'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

interface RatingStats {
  itemId: string
  avgRating: number
  roundedRating: number
  totalRatings: number
}

interface Props {
  /** ID of the item being rated (user ID or opportunity ID). */
  itemId: string
  /** When true the user can click to rate. Defaults to false (display-only). */
  interactive?: boolean
  /** Display size variant. */
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

/**
 * Displays star rating statistics for an item and optionally lets an
 * authenticated user submit or update their own rating (1–5 stars).
 */
export default function StarRating({ itemId, interactive = false, size = 'md' }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [hovered, setHovered] = useState(0)

  const { data: stats } = useQuery<RatingStats>({
    queryKey: ['rating-stats', itemId],
    queryFn: () => apiJson(`/ratings/${itemId}/stats`),
  })

  const { data: myRating } = useQuery<{ rating: number } | null>({
    queryKey: ['my-rating', itemId],
    queryFn: () => apiJson(`/ratings/${itemId}/my`),
    enabled: !!user && interactive,
  })

  const upsertMutation = useTrackedMutation('opportunity.rate', {
    mutationFn: (rating: number) =>
      apiJson('/ratings', { method: 'POST', body: JSON.stringify({ itemId, rating }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rating-stats', itemId] })
      queryClient.invalidateQueries({ queryKey: ['my-rating', itemId] })
      toast.success('Note enregistrée')
    },
    onError: (e: any) => toast.error(e.message || 'Impossible d\'enregistrer la note'),
  })

  const currentRating = hovered || myRating?.rating || 0
  const displayRating = stats?.avgRating ?? 0
  const starSize = SIZES[size]

  return (
    <div className="flex items-center gap-1.5">
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = interactive
            ? star <= currentRating
            : star <= Math.round(displayRating)
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive || !user || upsertMutation.isPending}
              onClick={() => interactive && user && upsertMutation.mutate(star)}
              onMouseEnter={() => interactive && user && setHovered(star)}
              onMouseLeave={() => interactive && user && setHovered(0)}
              className={`transition-colors ${
                interactive && user ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <Star
                className={`${starSize} ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Stats */}
      {stats && stats.totalRatings > 0 && (
        <span className="text-xs text-gray-500">
          {displayRating.toFixed(1)}
          <span className="text-gray-400 ml-1">({stats.totalRatings})</span>
        </span>
      )}

      {/* My rating indicator */}
      {interactive && user && myRating?.rating && (
        <span className="text-[10px] text-amber-600 font-medium">Votre note : {myRating.rating}</span>
      )}
    </div>
  )
}
