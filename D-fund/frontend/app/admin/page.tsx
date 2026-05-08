'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Search, Eye, ShieldAlert, Users, Briefcase, FileText, TrendingUp, Ban, ShieldCheck, Trash2, UserCog, Plus, Tag, Globe2, Layers } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-50 text-yellow-700',
  ACTIVE: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-red-50 text-red-600',
  CLOSED: 'bg-gray-100 text-gray-500',
}

export default function AdminPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'opportunities' | 'users' | 'industries' | 'markets' | 'features'>('opportunities')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')

  const isAdmin = user?.role === 'ADMIN'

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiJson('/opportunities/admin/stats'),
    enabled: isAdmin,
  })

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['admin-opportunities', statusFilter, search],
    queryFn: () =>
      apiJson(`/opportunities/admin/all?status=${statusFilter}&search=${encodeURIComponent(search)}`),
    enabled: isAdmin,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiJson(`/opportunities/admin/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }),
    onError: (err: any) => toast.error(err.message || 'Failed to update status'),
  })

  // ── Users tab ──
  const [userSearch, setUserSearch] = useState('')
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: () => apiJson(`/users/admin/list?search=${encodeURIComponent(userSearch)}&take=50`),
    enabled: isAdmin && activeTab === 'users',
  })

  const banMutation = useMutation({
    mutationFn: ({ id, ban }: { id: string; ban: boolean }) =>
      apiJson(`/users/admin/${id}/${ban ? 'ban' : 'unban'}`, { method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiJson(`/users/admin/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiJson(`/users/admin/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deleted')
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  // ── Industries tab ──
  const [newIndustryName, setNewIndustryName] = useState('')
  const { data: industries, isLoading: isLoadingIndustries } = useQuery<{ id: string; name: string; opportunitiesCount: number }[]>({
    queryKey: ['admin-industries'],
    queryFn: () => apiJson('/industries'),
    enabled: isAdmin && activeTab === 'industries',
  })
  const createIndustryMutation = useMutation({
    mutationFn: (name: string) => apiJson('/industries', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-industries'] }); queryClient.invalidateQueries({ queryKey: ['multiselect', '/industries'] }); setNewIndustryName('') },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })
  const deleteIndustryMutation = useMutation({
    mutationFn: (id: string) => apiJson(`/industries/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-industries'] }); queryClient.invalidateQueries({ queryKey: ['multiselect', '/industries'] }) },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  // ── Markets tab ──
  const [newMarketName, setNewMarketName] = useState('')
  const { data: markets, isLoading: isLoadingMarkets } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['admin-markets'],
    queryFn: () => apiJson('/markets'),
    enabled: isAdmin && activeTab === 'markets',
  })
  const createMarketMutation = useMutation({
    mutationFn: (name: string) => apiJson('/markets', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-markets'] }); queryClient.invalidateQueries({ queryKey: ['multiselect', '/markets'] }); setNewMarketName('') },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })
  const deleteMarketMutation = useMutation({
    mutationFn: (id: string) => apiJson(`/markets/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-markets'] }); queryClient.invalidateQueries({ queryKey: ['multiselect', '/markets'] }) },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  // ── Features tab ──
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeatureCategory, setNewFeatureCategory] = useState('')
  const { data: features, isLoading: isLoadingFeatures } = useQuery<{ id: string; name: string; category: string | null; opportunitiesCount: number }[]>({
    queryKey: ['admin-features'],
    queryFn: () => apiJson('/features'),
    enabled: isAdmin && activeTab === 'features',
  })
  const createFeatureMutation = useMutation({
    mutationFn: ({ name, category }: { name: string; category?: string }) =>
      apiJson('/features', { method: 'POST', body: JSON.stringify({ name, category: category || undefined }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-features'] }); setNewFeatureName(''); setNewFeatureCategory('') },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })
  const deleteFeatureMutation = useMutation({
    mutationFn: (id: string) => apiJson(`/features/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-features'] }),
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  return (
    <AuthGuard>
      {!isAdmin ? (
        <div className="container mx-auto px-6 py-16 max-w-xl text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h1>
          <p className="text-sm text-gray-500 mb-4">Cette page est réservée aux administrateurs D-Fund.</p>
          <Link href="/" className="text-sm text-[#3b49df] hover:underline">Retour à l'accueil</Link>
        </div>
      ) : (
        <div className="container mx-auto px-6 py-8 max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
            <p className="text-sm text-gray-500">Vue d'ensemble de la plateforme et modération des opportunités.</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Utilisateurs"
              value={stats?.users?.total}
              sub={`+${stats?.users?.newLast30Days ?? 0} ces 30j`}
              color="text-blue-600 bg-blue-50"
            />
            <StatCard
              icon={Briefcase}
              label="Opportunités actives"
              value={stats?.opportunities?.byStatus?.ACTIVE}
              sub={`${stats?.opportunities?.byStatus?.PENDING ?? 0} en attente`}
              color="text-green-600 bg-green-50"
            />
            <StatCard
              icon={FileText}
              label="Candidatures totales"
              value={stats?.applications?.total}
              sub={`+${stats?.applications?.newLast30Days ?? 0} ces 30j`}
              color="text-purple-600 bg-purple-50"
            />
            <StatCard
              icon={TrendingUp}
              label="Opportunités totales"
              value={stats?.opportunities?.total}
              sub={`${stats?.opportunities?.byStatus?.DRAFT ?? 0} brouillons`}
              color="text-orange-600 bg-orange-50"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
            {([
              { id: 'opportunities' as const, label: 'Opportunités', icon: Briefcase },
              { id: 'users' as const, label: 'Utilisateurs', icon: UserCog },
              { id: 'industries' as const, label: 'Secteurs', icon: Tag },
              { id: 'markets' as const, label: 'Marchés', icon: Globe2 },
              { id: 'features' as const, label: 'Fonctionnalités', icon: Layers },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === id
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ── OPPORTUNITIES TAB ─────────────────────────────────────────── */}
          {activeTab === 'opportunities' && (<>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Modération des opportunités</h2>
            <p className="text-sm text-gray-500">Approuvez ou rejetez les opportunités soumises par les utilisateurs.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par titre ou email du propriétaire..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
              />
            </div>
            <div className="flex gap-1">
              {['PENDING', 'ACTIVE', 'ARCHIVED', 'ALL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s === 'ALL' ? '' : s)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    (s === 'ALL' ? statusFilter === '' : statusFilter === s)
                      ? 'bg-[#3b49df] text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s === 'ALL' ? 'Tous' : s === 'PENDING' ? 'En attente' : s === 'ACTIVE' ? 'Actif' : s === 'ARCHIVED' ? 'Archivé' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="space-y-px">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : !opportunities?.length ? (
              <div className="py-12 text-center text-sm text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                Aucune opportunité ne correspond au filtre actuel.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {opportunities.map((opp: any) => (
                  <li key={opp.id} className="px-5 py-4 flex items-center gap-4">
                    {/* Cover */}
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-xs text-gray-400 font-bold">
                      {opp.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opp.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        opp.type?.slice(0, 2)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate">{opp.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[opp.status] || 'bg-gray-100 text-gray-500'}`}>
                          {opp.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {opp.type?.replace(/_/g, ' ')} ·{' '}
                        <span className="text-gray-500">{opp.owner?.name || opp.owner?.email}</span>
                        {' · '}{new Date(opp.createdAt).toLocaleDateString('fr-FR')}
                        {opp._count?.applications > 0 && (
                          <span className="ml-2 text-[#3b49df] font-semibold">
                            {opp._count.applications} app.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {opp.status !== 'ACTIVE' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: opp.id, status: 'ACTIVE' })}
                          disabled={statusMutation.isPending}
                          title="Approve"
                          className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {opp.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: opp.id, status: 'ARCHIVED' })}
                          disabled={statusMutation.isPending}
                          title="Reject / Archive"
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </>)}

          {/* ── USERS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Gestion des utilisateurs</h2>
                <p className="text-sm text-gray-500">Bannir, débannir, promouvoir ou supprimer des comptes.</p>
              </div>

              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher par nom ou email…"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {isLoadingUsers ? (
                  <div className="space-y-px">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-14 bg-gray-50 animate-pulse" />
                    ))}
                  </div>
                ) : !usersData?.data?.length ? (
                  <div className="py-12 text-center text-sm text-gray-500">Aucun utilisateur trouvé.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {usersData.data.map((u: any) => (
                      <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-[#3b49df]">
                          {u.profilePic
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" />
                            : (u.name?.[0] || 'U')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 truncate">{u.name || u.email}</span>
                            {u.role === 'ADMIN' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#3b49df]/10 text-[#3b49df] rounded-full font-semibold">ADMIN</span>
                            )}
                            {u.isBanned && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">BANNED</span>
                            )}
                            {!u.isEmailVerified && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">Non vérifié</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{u.email} · {new Date(u.createdAt).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Promote / demote */}
                          <button
                            onClick={() => roleMutation.mutate({ id: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                            disabled={roleMutation.isPending}
                            title={u.role === 'ADMIN' ? 'Rétrograder en utilisateur' : 'Promouvoir admin'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#3b49df] hover:bg-[#3b49df]/5 disabled:opacity-50"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          {/* Ban / unban */}
                          <button
                            onClick={() => banMutation.mutate({ id: u.id, ban: !u.isBanned })}
                            disabled={banMutation.isPending}
                            title={u.isBanned ? 'Débannir' : 'Bannir'}
                            className={`p-1.5 rounded-lg disabled:opacity-50 transition-colors ${
                              u.isBanned
                                ? 'text-green-500 hover:bg-green-50'
                                : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer l'utilisateur "${u.name || u.email}" ? Cette action est irréversible.`)) {
                                deleteUserMutation.mutate(u.id)
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                            title="Supprimer le compte"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {usersData?.total !== undefined && (
                <p className="text-xs text-gray-400 mt-2 text-right">{usersData.total} utilisateurs au total</p>
              )}
            </div>
          )}

          {/* ── INDUSTRIES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'industries' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Industries</h2>
                  <p className="text-sm text-gray-500">Liste de référence utilisée dans les formulaires d'opportunité et de profil.</p>
                </div>
              </div>

              {/* Add form */}
              <form
                className="flex gap-2 mb-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (newIndustryName.trim()) createIndustryMutation.mutate(newIndustryName.trim())
                }}
              >
                <input
                  value={newIndustryName}
                  onChange={(e) => setNewIndustryName(e.target.value)}
                  placeholder="Nouveau secteur…"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                />
                <button
                  type="submit"
                  disabled={!newIndustryName.trim() || createIndustryMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#3b49df] text-white text-sm font-semibold rounded-lg hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </form>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {isLoadingIndustries ? (
                  <div className="space-y-px">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 animate-pulse" />)}</div>
                ) : !industries?.length ? (
                  <div className="py-10 text-center text-sm text-gray-400">Aucun secteur pour l'instant.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {industries.map((ind) => (
                      <li key={ind.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{ind.name}</span>
                          {ind.opportunitiesCount > 0 && (
                            <span className="ml-2 text-xs text-gray-400">{ind.opportunitiesCount} opp.</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer le secteur "${ind.name}" ?`)) deleteIndustryMutation.mutate(ind.id)
                          }}
                          disabled={deleteIndustryMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {industries && (
                <p className="text-xs text-gray-400 mt-2 text-right">{industries.length} secteur(s)</p>
              )}
            </div>
          )}

          {/* ── MARKETS TAB ────────────────────────────────────────────────── */}
          {activeTab === 'markets' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Markets</h2>
                <p className="text-sm text-gray-500">Marchés géographiques utilisés dans les formulaires d'opportunité et de profil.</p>
              </div>

              <form
                className="flex gap-2 mb-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (newMarketName.trim()) createMarketMutation.mutate(newMarketName.trim())
                }}
              >
                <input
                  value={newMarketName}
                  onChange={(e) => setNewMarketName(e.target.value)}
                  placeholder="New market name…"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                />
                <button
                  type="submit"
                  disabled={!newMarketName.trim() || createMarketMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#3b49df] text-white text-sm font-semibold rounded-lg hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </form>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {isLoadingMarkets ? (
                  <div className="space-y-px">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 animate-pulse" />)}</div>
                ) : !markets?.length ? (
                  <div className="py-10 text-center text-sm text-gray-400">No markets yet.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {markets.map((mkt) => (
                      <li key={mkt.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-900">{mkt.name}</span>
                        <button
                          onClick={() => {
                            if (confirm(`Delete market "${mkt.name}"?`)) deleteMarketMutation.mutate(mkt.id)
                          }}
                          disabled={deleteMarketMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {markets && (
                <p className="text-xs text-gray-400 mt-2 text-right">{markets.length} markets</p>
              )}
            </div>
          )}

          {/* ── FEATURES TAB ───────────────────────────────────────────────── */}
          {activeTab === 'features' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Features</h2>
                <p className="text-sm text-gray-500">Opportunity type templates with AI prompt configuration.</p>
              </div>

              <form
                className="flex gap-2 mb-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (newFeatureName.trim()) createFeatureMutation.mutate({ name: newFeatureName.trim(), category: newFeatureCategory })
                }}
              >
                <input
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  placeholder="Feature name…"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                />
                <input
                  value={newFeatureCategory}
                  onChange={(e) => setNewFeatureCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                />
                <button
                  type="submit"
                  disabled={!newFeatureName.trim() || createFeatureMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#3b49df] text-white text-sm font-semibold rounded-lg hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </form>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {isLoadingFeatures ? (
                  <div className="space-y-px">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 animate-pulse" />)}</div>
                ) : !features?.length ? (
                  <div className="py-10 text-center text-sm text-gray-400">No features yet.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {features.map((feat) => (
                      <li key={feat.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{feat.name}</span>
                          {feat.category && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold">{feat.category}</span>
                          )}
                          {feat.opportunitiesCount > 0 && (
                            <span className="ml-2 text-xs text-gray-400">{feat.opportunitiesCount} opp.</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Delete feature "${feat.name}"?`)) deleteFeatureMutation.mutate(feat.id)
                          }}
                          disabled={deleteFeatureMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {features && (
                <p className="text-xs text-gray-400 mt-2 text-right">{features.length} features</p>
              )}
            </div>
          )}
        </div>
      )}
    </AuthGuard>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value?: number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value === undefined ? (
          <span className="inline-block w-16 h-7 bg-gray-100 animate-pulse rounded" />
        ) : (
          value.toLocaleString()
        )}
      </div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
