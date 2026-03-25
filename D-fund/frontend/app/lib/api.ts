/**
 * Utilitaire pour les appels API
 */

const API_TIMEOUT_MS = 15000

const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url && typeof window !== 'undefined') {
    console.warn('[api] NEXT_PUBLIC_API_URL is not set, falling back to localhost')
  }
  return url || 'http://localhost:3001/api/v1'
}

/**
 * Récupère le token JWT depuis le localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

/**
 * Stocke le token JWT dans le localStorage
 */
export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
}

/**
 * Supprime le token JWT
 */
export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
}

/**
 * Effectue un appel API avec authentification automatique
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const apiUrl = getApiUrl()
  const token = getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Effectue un appel API et parse la réponse JSON
 */
export const apiJson = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await apiCall(endpoint, options)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
    throw new Error(error.error || error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// ─── Shared types ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  profilePic?: string
  role: 'USER' | 'ADMIN'
  createdAt: string
}

export interface Opportunity {
  id: string
  name: string
  punchline?: string
  description?: string
  type: OpportunityType
  status: OpportunityStatus
  city?: string
  country?: string
  region?: string
  remote?: boolean
  image?: string
  backgroundImage?: string
  url?: string
  tags: string[]
  industries: string[]
  markets: string[]
  price?: number
  currency?: string
  ownerId: string
  owner?: Pick<User, 'id' | 'name' | 'profilePic'>
  createdAt: string
  updatedAt: string
}

export type ApplicationStage =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'OWNER_REVIEW'
  | 'SUCCESS'
  | 'ARCHIVED'

export interface Application {
  id: string
  opportunityId: string
  candidateId: string
  stage: ApplicationStage
  isDraft: boolean
  isClosed: boolean
  title?: string
  goalLetter?: string
  externalLink?: string
  externalLink2?: string
  reviewFeedback?: string
  feedbackTitle?: string
  submissionDate?: string
  reviewDate?: string
  opportunity?: Opportunity
  candidate?: User
  createdAt: string
  updatedAt: string
}

export interface PrivateDiscussion {
  id: string
  lastMessageAt: string
  unreadCount: number
  participants: Array<{
    userId: string
    user: Pick<User, 'id' | 'name' | 'profilePic'>
  }>
}

export interface PublicDiscussion {
  id: string
  type: string
  title?: string
  lastMessageAt: string
  messagesCount: number
  owner?: Pick<User, 'id' | 'name' | 'profilePic'>
  opportunity?: Pick<Opportunity, 'id' | 'name' | 'image' | 'backgroundImage'>
}

export interface Message {
  id: string
  content: string
  senderId: string
  receiverId?: string
  createdAt: string
  sender?: User
  receiver?: User
}

// ─── Opportunity types ────────────────────────────────────────────────────────

/**
 * Types pour les opportunités
 */
export type OpportunityType =
  | 'JOB_OPPORTUNITY'
  | 'TALENT_PROFILE'
  | 'CO_FOUNDER_OPPORTUNITY'
  | 'CO_FOUNDER_PROFILE'
  | 'BUSINESS_IDEA'
  | 'SUPPORT_OFFER'
  | 'SERVICE_LISTING'
  | 'SERVICE_REQUEST'
  | 'DEAL_FLOW'
  | 'INVESTOR_THESIS'
  | 'INVESTOR_PROFILE'
  | 'FUNDING_OPPORTUNITY'
  | 'EVENT'
  | 'CALL_FOR_STARTUPS'
  | 'MENTORSHIP_BA_OFFER'
  | 'PROJECT_SEEKING_SUPPORT'
  | 'VENTURE_PROGRAM'
  | 'CHILL_WORK_SPOT'
  | 'MARKET_ADVISOR'

export type OpportunityStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'CLOSED'

export interface CreateOpportunityData {
  name: string
  type: OpportunityType
  punchline?: string
  description?: string
  status?: OpportunityStatus
  city?: string
  country?: string
  region?: string
  remote?: boolean
  startDate?: string
  endDate?: string
  expirationDate?: string
  tags?: string[]
  industries?: string[]
  markets?: string[]
  url?: string
  image?: string
  backgroundImage?: string
  price?: number
  currency?: string
  pricingUnit?: string
  pricingDetails?: string
}

/**
 * Upload un fichier image vers Supabase Storage via le backend
 * @param file - Fichier à uploader
 * @param prefix - Préfixe du chemin (ex: 'opportunities', 'avatars')
 * @param resourceId - ID de la ressource (ex: opportunityId, userId)
 * @param bucket - Nom du bucket (optionnel, défaut: 'images')
 * @returns URL publique du fichier uploadé
 */
export const uploadImage = async (
  file: File,
  prefix: string,
  resourceId: string,
  bucket?: string,
): Promise<string> => {
  const apiUrl = getApiUrl()
  const token = getAuthToken()

  if (!token) {
    throw new Error('Authentication required to upload files')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('prefix', prefix)
  formData.append('resourceId', resourceId)
  if (bucket) {
    formData.append('bucket', bucket)
  }

  const response = await fetch(`${apiUrl}/storage/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.url
}

/**
 * Crée une nouvelle opportunité
 */
export const createOpportunity = async (data: CreateOpportunityData) => {
  return apiJson('/opportunities', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
