'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MapPin, Users, UserCircle2, Building2 } from 'lucide-react'
import { useAuth } from '@/app/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'
import { useToggleFollow } from '@/app/hooks/useFollow'
import { qk } from '@/app/lib/queryKeys'
import { CommunityRowSkeleton } from './CommunitySkeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  bio: string | null
  profilePic: string | null
  city: string | null
  country: string | null
  btoCProfile: { tags: string[]; industries: string[]; seniorityLevel: string | null; followersCount: number } | null
  btoBProfile: { companyName: string; punchline: string | null; logo: string | null; followersCount: number } | null
}

interface Talent {
  userId: string
  tags: string[]
  industries: string[]
  seniorityLevel: string | null
  followersCount: number
  user: { id: string; name: string; profilePic: string | null; city: string | null; country: string | null; bio: string | null }
}

interface Company {
  userId: string
  companyName: string
  punchline: string | null
  logo: string | null
  industries: string[]
  marketFocus: string[]
  followersCount: number
  user: { id: string; name: string; profilePic: string | null; city: string | null; country: string | null }
}

type Tab = 'members' | 'talents' | 'companies'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, square }: { src?: string | null; name?: string | null; square?: boolean }) {
  const [error, setError] = useState(false)
  const showImg = !!src && !error
  return (
    <div className={`w-10 h-10 shrink-0 ${square ? 'rounded-lg' : 'rounded-full'} bg-gray-100 overflow-hidden flex items-center justify-center font-bold text-sm text-[#3b49df] relative`}>
      {showImg
        ? <Image src={src!} alt="" fill className="object-cover" sizes="40px" onError={() => setError(true)} />
        : (name?.[0]?.toUpperCase() || '?')}
    </div>
  )
}

// ─── Row actions (Follow + Message) ──────────────────────────────────────────

function RowActions({ userId, isFollowing }: { userId: string; isFollowing: boolean }) {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const toggleFollow = useToggleFollow(userId, isFollowing)

  const startConversation = useTrackedMutation('conversation.start', {
    mutationFn: () => apiJson(`/messages/private/start/${userId}`, { method: 'POST' }),
    onSuccess: (discussion: any) => {
      queryClient.invalidateQueries({ queryKey: qk.privateDiscussions(user?.id ?? '') })
      if (discussion?.id) router.push(`/chat/private/${discussion.id}`)
    },
    onError: () => toast.error("Impossible d'ouvrir la conversation"),
  })

  if (!user) return null

  return (
    <div className="flex items-center gap-2 shrink-0 ml-3">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); toggleFollow.toggleFollow() }}
        disabled={toggleFollow.isPending}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
          isFollowing
            ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
            : 'border-[#3b49df] text-[#3b49df] hover:bg-[#3b49df]/5'
        }`}
      >
        {toggleFollow.isPending ? '…' : isFollowing ? 'Suivi·e' : 'Suivre'}
      </button>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); startConversation.mutate(undefined) }}
        disabled={startConversation.isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {startConversation.isPending ? '…' : 'Message'}
      </button>
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MemberRow({ m, isFollowing }: { m: Member; isFollowing: boolean }) {
  const subtitle = m.btoBProfile?.companyName ?? m.btoCProfile?.seniorityLevel ?? null
  const tags = (m.btoCProfile?.tags ?? []).slice(0, 3)
  const loc = [m.city, m.country].filter(Boolean).join(', ')

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <Link href={`/profiles/${m.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={m.profilePic} name={m.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{m.name}</span>
            {m.btoCProfile && <UserCircle2 className="w-3 h-3 text-[#3b49df] shrink-0" />}
            {m.btoBProfile && <Building2 className="w-3 h-3 text-purple-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {subtitle && <span className="text-xs text-gray-500 truncate">{subtitle}</span>}
            {loc && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                <MapPin className="w-2.5 h-2.5 shrink-0" />{loc}
              </span>
            )}
            {tags.map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">{t}</span>
            ))}
          </div>
        </div>
      </Link>
      <RowActions userId={m.id} isFollowing={isFollowing} />
    </div>
  )
}

function TalentRow({ t, isFollowing }: { t: Talent; isFollowing: boolean }) {
  const loc = [t.user.city, t.user.country].filter(Boolean).join(', ')
  const tags = t.tags.slice(0, 3)

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <Link href={`/profiles/${t.user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={t.user.profilePic} name={t.user.name} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate block">{t.user.name}</span>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {t.seniorityLevel && <span className="text-xs text-gray-500 capitalize">{t.seniorityLevel}</span>}
            {loc && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                <MapPin className="w-2.5 h-2.5 shrink-0" />{loc}
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </Link>
      <RowActions userId={t.userId} isFollowing={isFollowing} />
    </div>
  )
}

function CompanyRow({ c, isFollowing }: { c: Company; isFollowing: boolean }) {
  const loc = [c.user.city, c.user.country].filter(Boolean).join(', ')
  const industries = c.industries.slice(0, 2)

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <Link href={`/profiles/${c.user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={c.logo} name={c.companyName} square />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate block">{c.companyName}</span>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs text-gray-500 truncate">{c.user.name}</span>
            {loc && (
              <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                <MapPin className="w-2.5 h-2.5 shrink-0" />{loc}
              </span>
            )}
            {industries.map((i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">{i}</span>
            ))}
          </div>
        </div>
      </Link>
      <RowActions userId={c.userId} isFollowing={isFollowing} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'members',   label: 'Tous les membres', icon: Users       },
  { id: 'talents',   label: 'Talents',           icon: UserCircle2 },
  { id: 'companies', label: 'Entreprises',        icon: Building2   },
]

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('members')
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const { user } = useAuth()

  const { data: members = [], isLoading: loadingM } = useQuery<Member[]>({
    queryKey: qk.communityMembers(),
    queryFn: () => apiJson('/profiles/lists/members?take=60'),
    enabled: tab === 'members',
    staleTime: 60_000,
  })

  const { data: talents = [], isLoading: loadingT } = useQuery<Talent[]>({
    queryKey: qk.communityTalents(),
    queryFn: () => apiJson('/profiles/lists/talents?take=60'),
    enabled: tab === 'talents',
    staleTime: 60_000,
  })

  const { data: companies = [], isLoading: loadingC } = useQuery<Company[]>({
    queryKey: qk.communityCompanies(),
    queryFn: () => apiJson('/profiles/lists/companies?take=60'),
    enabled: tab === 'companies',
    staleTime: 60_000,
  })

  const { data: following } = useQuery({
    queryKey: qk.socialFollowing(user?.id ?? ''),
    queryFn: () => apiJson(`/social/following/${user?.id}`),
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  const followingIds = useMemo(() => {
    const set = new Set<string>()
    ;(following as any[] || []).forEach((u) => { if (u.id) set.add(u.id) })
    return set
  }, [following])

  const industryOptions = useMemo(() => {
    const set = new Set<string>()
    if (tab === 'members')   members.forEach((m) => m.btoCProfile?.industries?.forEach((i) => set.add(i)))
    if (tab === 'talents')   talents.forEach((t) => t.industries?.forEach((i) => set.add(i)))
    if (tab === 'companies') companies.forEach((c) => c.industries?.forEach((i) => set.add(i)))
    return Array.from(set).sort()
  }, [tab, members, talents, companies])

  const q = search.trim().toLowerCase()

  const filteredMembers = useMemo(() =>
    members.filter((m) => {
      const matchQ = !q || m.name?.toLowerCase().includes(q) || m.bio?.toLowerCase().includes(q) || m.btoBProfile?.companyName?.toLowerCase().includes(q)
      const matchI = !industryFilter || m.btoCProfile?.industries?.includes(industryFilter)
      return matchQ && matchI
    }), [members, q, industryFilter])

  const filteredTalents = useMemo(() =>
    talents.filter((t) => {
      const matchQ = !q || t.user.name?.toLowerCase().includes(q) || t.user.bio?.toLowerCase().includes(q) || t.tags?.some((tag) => tag.toLowerCase().includes(q))
      const matchI = !industryFilter || t.industries?.includes(industryFilter)
      return matchQ && matchI
    }), [talents, q, industryFilter])

  const filteredCompanies = useMemo(() =>
    companies.filter((c) => {
      const matchQ = !q || c.companyName?.toLowerCase().includes(q) || c.user.name?.toLowerCase().includes(q) || c.punchline?.toLowerCase().includes(q)
      const matchI = !industryFilter || c.industries?.includes(industryFilter)
      return matchQ && matchI
    }), [companies, q, industryFilter])

  const isLoading = (tab === 'members' && loadingM) || (tab === 'talents' && loadingT) || (tab === 'companies' && loadingC)
  const count = tab === 'members' ? filteredMembers.length : tab === 'talents' ? filteredTalents.length : filteredCompanies.length

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Header compact */}
      <div className="bg-white border-b border-gray-100 px-4 py-5">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Communauté</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, compétences, entreprise…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] bg-white outline-none"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setIndustryFilter('') }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px shrink-0 whitespace-nowrap ${
                tab === id
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Filtres secteurs */}
        {industryOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setIndustryFilter('')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                !industryFilter ? 'bg-[#3b49df] text-white border-[#3b49df]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
              }`}
            >
              Tous
            </button>
            {industryOptions.map((ind) => (
              <button
                key={ind}
                onClick={() => setIndustryFilter(industryFilter === ind ? '' : ind)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  industryFilter === ind ? 'bg-[#3b49df] text-white border-[#3b49df]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        )}

        {/* Compteur */}
        {!isLoading && (
          <p className="text-xs text-gray-400 mb-2 px-1">
            {count} {tab === 'companies' ? (count === 1 ? 'entreprise' : 'entreprises') : tab === 'talents' ? (count === 1 ? 'talent' : 'talents') : (count === 1 ? 'membre' : 'membres')}
            {(search || industryFilter) ? ' correspondant aux filtres' : ''}
          </p>
        )}

        {/* Liste */}
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <CommunityRowSkeleton key={i} />)
          ) : count === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Aucun résultat trouvé.
            </div>
          ) : (
            <>
              {tab === 'members'   && filteredMembers.map((m) => <MemberRow  key={m.id}      m={m} isFollowing={followingIds.has(m.id)} />)}
              {tab === 'talents'   && filteredTalents.map((t) => <TalentRow  key={t.userId}  t={t} isFollowing={followingIds.has(t.userId)} />)}
              {tab === 'companies' && filteredCompanies.map((c) => <CompanyRow key={c.userId} c={c} isFollowing={followingIds.has(c.userId)} />)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
