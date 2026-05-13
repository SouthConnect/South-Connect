'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import Link from 'next/link'
import { Search, MapPin, Users, UserCircle2, Building2, Briefcase } from 'lucide-react'
import Image from 'next/image'

// ─── Data shapes ─────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  bio: string | null
  profilePic: string | null
  city: string | null
  country: string | null
  btoCProfile: {
    tags: string[]
    industries: string[]
    seniorityLevel: string | null
    followersCount: number
  } | null
  btoBProfile: {
    companyName: string
    punchline: string | null
    logo: string | null
    followersCount: number
  } | null
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ src, name, size = 'md', shape = 'circle' }: {
  src?: string | null; name?: string | null
  size?: 'sm' | 'md' | 'lg'; shape?: 'circle' | 'square'
}) {
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-12 h-12 text-sm'
  const shapeClass = shape === 'square' ? 'rounded-xl' : 'rounded-full'
  return (
    <div className={`${sizeClass} ${shapeClass} bg-gray-100 overflow-hidden flex items-center justify-center font-bold text-[#3b49df] shrink-0 relative`}>
      {src
        ? <Image src={src} alt="" fill className="object-cover" sizes="64px" />
        : (name?.[0]?.toUpperCase() || '?')}
    </div>
  )
}

function TagChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">
      {label}
    </span>
  )
}

function LocationLine({ city, country }: { city?: string | null; country?: string | null }) {
  const loc = [city, country].filter(Boolean).join(', ')
  if (!loc) return null
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-400">
      <MapPin className="w-3 h-3 shrink-0" />{loc}
    </span>
  )
}

function MemberCard({ m }: { m: Member }) {
  const tags = m.btoCProfile?.tags?.slice(0, 3) ?? []
  return (
    <Link href={`/profiles/${m.id}`} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 hover:shadow-md transition-shadow group">
      <Avatar src={m.profilePic} name={m.name} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 group-hover:text-[#3b49df] transition-colors truncate">{m.name}</p>
            {m.btoBProfile?.companyName && (
              <p className="text-xs text-gray-500 truncate">{m.btoBProfile.companyName}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0 mt-0.5">
            {m.btoCProfile && <UserCircle2 className="w-3.5 h-3.5 text-[#3b49df]" />}
            {m.btoBProfile && <Building2 className="w-3.5 h-3.5 text-purple-500" />}
          </div>
        </div>
        {m.bio && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{m.bio}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <LocationLine city={m.city} country={m.country} />
          {tags.map((t) => <TagChip key={t} label={t} />)}
        </div>
      </div>
    </Link>
  )
}

function TalentCard({ t }: { t: Talent }) {
  const tags = t.tags?.slice(0, 3) ?? []
  return (
    <Link href={`/profiles/${t.user.id}`} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 hover:shadow-md transition-shadow group">
      <Avatar src={t.user.profilePic} name={t.user.name} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 group-hover:text-[#3b49df] transition-colors truncate">{t.user.name}</p>
        {t.seniorityLevel && <p className="text-xs text-gray-500 capitalize">{t.seniorityLevel}</p>}
        {t.user.bio && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{t.user.bio}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <LocationLine city={t.user.city} country={t.user.country} />
          {tags.map((tag) => <TagChip key={tag} label={tag} />)}
        </div>
      </div>
    </Link>
  )
}

function CompanyCard({ c }: { c: Company }) {
  const industries = c.industries?.slice(0, 2) ?? []
  return (
    <Link href={`/profiles/${c.user.id}`} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 hover:shadow-md transition-shadow group">
      <Avatar src={c.logo} name={c.companyName} size="lg" shape="square" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 group-hover:text-[#3b49df] transition-colors truncate">{c.companyName}</p>
        <p className="text-xs text-gray-500 truncate">{c.user.name}</p>
        {c.punchline && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 italic">{c.punchline}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <LocationLine city={c.user.city} country={c.user.country} />
          {industries.map((i) => <TagChip key={i} label={i} />)}
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'members' | 'talents' | 'companies'
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'members',   label: 'Tous les membres', icon: Users },
  { id: 'talents',   label: 'Talents',           icon: UserCircle2 },
  { id: 'companies', label: 'Entreprises',        icon: Building2 },
]

export default function ProfilesBrowsePage() {
  const [tab, setTab] = useState<Tab>('members')
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')

  const { data: members = [], isLoading: loadingM } = useQuery<Member[]>({
    queryKey: ['profiles-members'],
    queryFn: () => apiJson('/profiles/lists/members?take=60'),
    enabled: tab === 'members',
    staleTime: 60_000,
  })

  const { data: talents = [], isLoading: loadingT } = useQuery<Talent[]>({
    queryKey: ['profiles-talents'],
    queryFn: () => apiJson('/profiles/lists/talents?take=60'),
    enabled: tab === 'talents',
    staleTime: 60_000,
  })

  const { data: companies = [], isLoading: loadingC } = useQuery<Company[]>({
    queryKey: ['profiles-companies'],
    queryFn: () => apiJson('/profiles/lists/companies?take=60'),
    enabled: tab === 'companies',
    staleTime: 60_000,
  })

  // Derive industry options from currently loaded data
  const industryOptions = useMemo(() => {
    const set = new Set<string>()
    if (tab === 'members') {
      members.forEach((m) => {
        m.btoCProfile?.industries?.forEach((i) => set.add(i))
        // btoBProfile doesn't include industries in members endpoint
      })
    }
    if (tab === 'talents') talents.forEach((t) => t.industries?.forEach((i) => set.add(i)))
    if (tab === 'companies') companies.forEach((c) => c.industries?.forEach((i) => set.add(i)))
    return Array.from(set).sort()
  }, [tab, members, talents, companies])

  const q = search.trim().toLowerCase()

  const filteredMembers = useMemo(() =>
    members.filter((m) => {
      const matchQ = !q
        || m.name?.toLowerCase().includes(q)
        || m.bio?.toLowerCase().includes(q)
        || m.btoBProfile?.companyName?.toLowerCase().includes(q)
      const matchI = !industryFilter || m.btoCProfile?.industries?.includes(industryFilter)
      return matchQ && matchI
    }), [members, q, industryFilter])

  const filteredTalents = useMemo(() =>
    talents.filter((t) => {
      const matchQ = !q
        || t.user.name?.toLowerCase().includes(q)
        || t.user.bio?.toLowerCase().includes(q)
        || t.tags?.some((tag) => tag.toLowerCase().includes(q))
      const matchI = !industryFilter || t.industries?.includes(industryFilter)
      return matchQ && matchI
    }), [talents, q, industryFilter])

  const filteredCompanies = useMemo(() =>
    companies.filter((c) => {
      const matchQ = !q
        || c.companyName?.toLowerCase().includes(q)
        || c.user.name?.toLowerCase().includes(q)
        || c.punchline?.toLowerCase().includes(q)
      const matchI = !industryFilter || c.industries?.includes(industryFilter)
      return matchQ && matchI
    }), [companies, q, industryFilter])

  const isLoading = (tab === 'members' && loadingM) || (tab === 'talents' && loadingT) || (tab === 'companies' && loadingC)
  const count = tab === 'members' ? filteredMembers.length : tab === 'talents' ? filteredTalents.length : filteredCompanies.length

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Personnes</h1>
          <p className="text-sm text-gray-500">Découvrez les talents, fondateurs et entreprises de l'écosystème D-Fund.</p>
          <div className="relative mt-5 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, compétences, entreprise…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-[#3b49df] focus:border-[#3b49df] bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setIndustryFilter('') }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === id
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Industry filter pills (only when data has industries) */}
        {industryOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setIndustryFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                !industryFilter
                  ? 'bg-[#3b49df] text-white border-[#3b49df]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
              }`}
            >
              Tous les secteurs
            </button>
            {industryOptions.map((ind) => (
              <button
                key={ind}
                onClick={() => setIndustryFilter(industryFilter === ind ? '' : ind)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  industryFilter === ind
                    ? 'bg-[#3b49df] text-white border-[#3b49df]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#3b49df] hover:text-[#3b49df]'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        {!isLoading && (
          <p className="text-xs text-gray-400 mb-4">
            {count} {count === 1 ? 'résultat' : 'résultats'}
            {(search || industryFilter) ? ' correspondant à vos filtres' : ''}
          </p>
        )}

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="py-20 text-center">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun résultat trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tab === 'members'   && filteredMembers.map((m) => <MemberCard  key={m.id}      m={m} />)}
            {tab === 'talents'   && filteredTalents.map((t) => <TalentCard  key={t.userId}  t={t} />)}
            {tab === 'companies' && filteredCompanies.map((c) => <CompanyCard key={c.userId} c={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
