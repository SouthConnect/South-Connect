'use client'

import { MapPin, Users, ArrowUp, MessageSquare, Star } from 'lucide-react'

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
  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer">
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
          <div className="flex items-center gap-4 text-gray-400 text-sm mt-auto">
            <div className="flex items-center gap-1">
              <ArrowUp className="w-4 h-4" />
              {opportunity.likesCount}
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {opportunity.messagesCount}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {opportunity.savedCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
