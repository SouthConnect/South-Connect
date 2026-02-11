/**
 * Utilitaire pour les appels API
 */

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
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

  // On force un objet simple pour pouvoir ajouter proprement l'en-tête Authorization
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  })

  return response
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
