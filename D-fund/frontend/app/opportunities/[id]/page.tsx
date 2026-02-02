'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { MapPin, Calendar, Clock, Tag, ArrowLeft, Send, MessageSquare, ThumbsUp, Bookmark, Share2 } from 'lucide-react'
import Link from 'next/link'

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params?.id as string

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => apiJson(`/opportunities/${id}`),
    enabled: !!id,
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      apiJson('/applications', {
        method: 'POST',
        body: JSON.stringify({ opportunityId: id }),
      }),
    onSuccess: (app: any) => {
      router.push(`/applications/${app.id}`)
    },
    onError: (error: any) => {
      alert(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 w-1/2 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Opportunity not found</h1>
        <Link href="/" className="text-[#3b49df] hover:underline">Return home</Link>
      </div>
    )
  }

  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Cover Image */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <img 
          src={opportunity.backgroundImage || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80"} 
          alt="" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-8 left-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-xs font-bold text-[#3b49df] uppercase tracking-wider mb-2">
                {opportunity.type.replace(/_/g, ' ')}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                {opportunity.name}
              </h1>
              {opportunity.punchline && (
                <p className="text-xl text-gray-600 mb-6 font-medium">
                  {opportunity.punchline}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-8 border-y border-gray-100 py-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {opportunity.city && opportunity.country ? `${opportunity.city}, ${opportunity.country}` : 'Remote'}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Posted on {date}
                </div>
                {opportunity.expirationDate && (
                  <div className="flex items-center gap-2 text-red-500 font-medium">
                    <Clock className="w-4 h-4" />
                    Expires {new Date(opportunity.expirationDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                <div className="whitespace-pre-wrap">
                  {opportunity.description || 'No description provided.'}
                </div>
              </div>

              {opportunity.tags?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Discussion Preview (Place-holder) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Discussion</h3>
                <span className="text-gray-500 text-sm">{opportunity.messagesCount} messages</span>
              </div>
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>Join the conversation about this opportunity.</p>
                <button className="mt-4 text-[#3b49df] font-bold hover:underline">
                  View all messages
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 sticky top-8">
              {user ? (
                opportunity.ownerId === user.id ? (
                  <Link 
                    href={`/opportunities/${id}/edit`}
                    className="flex items-center justify-center w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Edit Opportunity
                  </Link>
                ) : (
                  <button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    {applyMutation.isPending ? 'Creating draft...' : 'Apply Now'}
                  </button>
                )
              ) : (
                <Link 
                  href="/login"
                  className="flex items-center justify-center w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm"
                >
                  Sign in to Apply
                </Link>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 py-2 border border-gray-100 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  Like
                </button>
                <button className="flex items-center justify-center gap-2 py-2 border border-gray-100 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Bookmark className="w-4 h-4" />
                  Save
                </button>
              </div>
              
              <button className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                <Share2 className="w-4 h-4" />
                Share Opportunity
              </button>

              <hr className="border-gray-100" />

              <div className="pt-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Posted by
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-[#3b49df]">
                    {opportunity.owner.profilePic ? (
                      <img src={opportunity.owner.profilePic} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      opportunity.owner.name[0]
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{opportunity.owner.name}</div>
                    <Link href={`/profiles/${opportunity.ownerId}`} className="text-xs text-[#3b49df] font-bold hover:underline">
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Activity</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Applications</span>
                  <span className="font-bold text-gray-900">{opportunity.applicationsCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Likes</span>
                  <span className="font-bold text-gray-900">{opportunity.likesCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Saved by</span>
                  <span className="font-bold text-gray-900">{opportunity.savedCount} users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
