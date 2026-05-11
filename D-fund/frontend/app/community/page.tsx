'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CommunityPage() {
  const [tab, setTab] = useState<'btoc' | 'btob' | 'all'>('btoc')
  const [search, setSearch] = useState('')
  const { user } = useAuth()

  const { data: talents, isLoading: loadingTalents } = useQuery({
    queryKey: ['community-btoc'],
    queryFn: () => apiJson('/profiles/lists/talents'),
    enabled: tab === 'btoc',
  })

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['community-btob'],
    queryFn: () => apiJson('/profiles/lists/companies'),
    enabled: tab === 'btob',
  })

  const { data: following } = useQuery({
    queryKey: ['social-following', user?.id],
    queryFn: () => apiJson(`/social/following/${user?.id}`),
    enabled: !!user?.id,
  })

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['community-members'],
    queryFn: () => apiJson('/profiles/lists/members'),
    enabled: tab === 'all',
  })

  const followingIds = useMemo(() => {
    const set = new Set<string>()
    ;(following || []).forEach((u: any) => {
      if (u.id) set.add(u.id)
    })
    return set
  }, [following])

  let list: any[] = []
  let isLoading = false

  if (tab === 'btoc') {
    list = talents || []
    isLoading = loadingTalents
  } else if (tab === 'btob') {
    list = companies || []
    isLoading = loadingCompanies
  } else {
    list =
      members?.map((m: any) => {
        const source = m.btoBProfile || m.btoCProfile
        return {
          id: m.id,
          userId: m.id,
          user: {
            name: m.name || m.email,
            profilePic: m.profilePic,
          },
          companyName: m.btoBProfile?.companyName || m.name || m.email,
          logo: m.btoBProfile?.logo || null,
          followersCount:
            m.btoBProfile?.followersCount ?? m.btoCProfile?.followersCount ?? 0,
          opportunitiesCount:
            m.btoBProfile?.opportunitiesCount ?? m.btoCProfile?.opportunitiesCount ?? 0,
        }
      }) || []
    isLoading = loadingMembers
  }

  const filtered = (list || []).filter((item: any) => {
    if (!search) return true
    const baseName =
      tab === 'btoc'
        ? item.user?.name
        : tab === 'btob'
        ? item.companyName
        : item.user?.name || item.companyName
    return baseName?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communauté</h1>
          <p className="text-sm text-gray-500">
            Découvrez les talents et entreprises de l'écosystème D-Fund.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 border-b border-gray-200 text-sm">
          <button
            onClick={() => setTab('btoc')}
            className={`pb-3 px-1 border-b-2 font-semibold ${
              tab === 'btoc'
                ? 'border-[#3b49df] text-[#3b49df]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            BtoC
          </button>
          <button
            onClick={() => setTab('btob')}
            className={`pb-3 px-1 border-b-2 font-semibold ${
              tab === 'btob'
                ? 'border-[#3b49df] text-[#3b49df]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            BtoB
          </button>
          <button
            onClick={() => setTab('all')}
            className={`pb-3 px-1 border-b-2 font-semibold ${
              tab === 'all'
                ? 'border-[#3b49df] text-[#3b49df]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tous les membres
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-[#3b49df]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 animate-pulse" />
          ))
        ) : filtered.length ? (
          filtered.map((item: any) => (
            <CommunityRow
              key={item.id}
              item={item}
              tab={tab}
              isFollowing={user ? followingIds.has(item.userId) : false}
            />
          ))
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm">
            Aucun profil trouvé.
          </div>
        )}
      </div>
    </div>
  )
}

function CommunityRow({
  item,
  tab,
  isFollowing,
}: {
  item: any
  tab: 'btoc' | 'btob' | 'all'
  isFollowing: boolean
}) {
  const name = tab === 'btoc' ? item.user?.name : (item.companyName || item.user?.name)
  const followers = item.followersCount ?? 0
  const opportunities = item.opportunitiesCount ?? 0
  const avatar =
    (tab === 'btoc' ? item.user?.profilePic : (item.logo || item.user?.profilePic)) || undefined

  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const toggleFollow = useMutation({
    mutationFn: () =>
      apiJson(`/social/follow/${item.userId}`, { method: isFollowing ? 'DELETE' : 'POST' }),
    onMutate: async () => {
      const key = ['social-following', user?.id]
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<any[]>(key)
      queryClient.setQueryData<any[]>(key, (old = []) =>
        isFollowing
          ? old.filter((u) => u.id !== item.userId)
          : [...old, { id: item.userId }],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['social-following', user?.id], ctx.previous)
      }
      toast.error('Impossible de modifier le suivi')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-following', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['community-btoc'] })
      queryClient.invalidateQueries({ queryKey: ['community-btob'] })
    },
  })

  const startConversation = useMutation({
    mutationFn: () =>
      apiJson(`/messages/private/start/${item.userId}`, { method: 'POST' }),
    onSuccess: (discussion) => {
      if (discussion?.id) router.push(`/chat/private/${discussion.id}`)
    },
    onError: () => toast.error('Impossible d\'ouvrir la conversation'),
  })

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
      <Link
        href={`/profiles/${item.userId}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-semibold text-[#3b49df]">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            name?.[0] || '?'
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
          <div className="text-xs text-gray-500">
            {followers} abonné{followers !== 1 ? 's' : ''} · {opportunities} opportunité{opportunities !== 1 ? 's' : ''}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 ml-4">
        <button
          type="button"
          onClick={() => {
            if (!user) { router.push('/login'); return }
            toggleFollow.mutate()
          }}
          disabled={toggleFollow.isPending}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            isFollowing
              ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'border-[#3b49df] text-[#3b49df] hover:bg-[#3b49df]/5'
          } disabled:opacity-50`}
        >
          {toggleFollow.isPending ? 'Suivi…' : isFollowing ? 'Suivi·e' : 'Suivre'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!user) { router.push('/login'); return }
            startConversation.mutate()
          }}
          disabled={startConversation.isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {startConversation.isPending ? '…' : 'Message'}
        </button>
      </div>
    </div>
  )
}

