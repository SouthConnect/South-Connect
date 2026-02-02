'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiJson, OpportunityType } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { ArrowLeft, Plus, Save, Info, MapPin, Globe, DollarSign } from 'lucide-react'
import Link from 'next/link'

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; description: string }[] = [
  { value: 'JOB_OPPORTUNITY', label: 'Job Opportunity', description: 'Post a job offer for your startup or company.' },
  { value: 'CO_FOUNDER_OPPORTUNITY', label: 'Co-founder Opportunity', description: 'Find a partner to build your next big idea.' },
  { value: 'BUSINESS_IDEA', label: 'Business Idea', description: 'Share a concept and find collaborators or feedback.' },
  { value: 'SERVICE_LISTING', label: 'Service Listing', description: 'Offer your professional services to the community.' },
  { value: 'INVESTOR_PROFILE', label: 'Investor Profile', description: 'Are you an investor? Let people know your thesis.' },
  { value: 'FUNDING_OPPORTUNITY', label: 'Funding Opportunity', description: 'List a funding round or grant.' },
  { value: 'EVENT', label: 'Event', description: 'Promote a webinar, workshop, or networking event.' },
  { value: 'MENTORSHIP_BA_OFFER', label: 'Mentorship / BA Offer', description: 'Offer your time to mentor early-stage founders.' },
]

export default function CreateOpportunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState<OpportunityType | ''>('')
  
  const createMutation = useMutation({
    mutationFn: (data: any) => apiJson('/opportunities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (data) => {
      alert('Opportunity created successfully!')
      router.push(`/opportunities/${data.id}`)
    },
    onError: (error) => {
      alert(error.message)
    }
  })

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">You must be signed in</h1>
        <Link href="/login" className="text-[#3b49df] hover:underline">Sign in</Link>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedType) return
    
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    createMutation.mutate({
      ...data,
      type: selectedType,
      remote: !!data.remote,
      tags: (data.tags as string).split(',').map(t => t.trim()).filter(Boolean),
      industries: (data.industries as string).split(',').map(t => t.trim()).filter(Boolean),
      markets: (data.markets as string).split(',').map(t => t.trim()).filter(Boolean),
      price: data.price ? parseFloat(data.price as string) : undefined,
    })
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-8">
        <div className="container mx-auto px-4 flex items-center justify-between max-w-5xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create new opportunity</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Type Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#3b49df]" />
                What are you listing?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OPPORTUNITY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selectedType === type.value
                        ? 'border-[#3b49df] bg-[#3b49df]/5 ring-2 ring-[#3b49df]/10'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">{type.label}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Details */}
            {selectedType && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#3b49df]" />
                  Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
                    <input
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="e.g. Lead React Developer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Punchline (short summary)</label>
                    <input
                      name="punchline"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="e.g. Join our fast-growing fintech startup"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      name="description"
                      required
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="Describe the opportunity in detail..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        City
                      </label>
                      <input
                        name="city"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Country
                      </label>
                      <input
                        name="country"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="remote"
                      name="remote"
                      className="rounded border-gray-300 text-[#3b49df] focus:ring-[#3b49df]"
                    />
                    <label htmlFor="remote" className="text-sm font-medium text-gray-700">This is a remote opportunity</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column / Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 sticky top-8">
              <button
                type="submit"
                disabled={!selectedType || createMutation.isPending}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {createMutation.isPending ? 'Publishing...' : 'Publish Opportunity'}
              </button>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Additional Info</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price / Budget
                  </label>
                  <input
                    name="price"
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industries (comma separated)</label>
                  <input
                    name="industries"
                    placeholder="Tech, Health, Finance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    name="tags"
                    placeholder="React, Remote, Full-time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
