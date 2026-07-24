/**
 * HTTP utility layer for communicating with the D-Fund backend API.
 *
 * Authentication is handled via HttpOnly cookies set by the backend.
 * JavaScript never reads or writes the token — the browser sends it
 * automatically on every credentialed request.
 *
 * Transparent token refresh: when a 401 is received, one silent call to
 * POST /auth/refresh is attempted. If it succeeds the original request is
 * retried once. If it fails the caller receives the 401 as-is and dispatches
 * an 'auth:session-expired' event so the AuthContext can clear local state.
 *
 * Types are defined in app/lib/types.ts (single source of truth).
 */
import type { CreateOpportunityData, OpportunityType } from '@/app/lib/types'

// Re-exports — source unique : app/lib/types.ts
export type { AuthUser as User, Opportunity, ApplicationStage, Application, PrivateDiscussion, PublicDiscussion, Message, OpportunityType, OpportunityStatus, CreateOpportunityData, ApplicationCandidate } from '@/app/lib/types'

/**
 * HTTP-aware error that preserves the response status code.
 * Use `instanceof ApiError` to detect API errors and `error.status` to branch on the code.
 */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_TIMEOUT_MS = 15000

/**
 * Singleton promise shared across all concurrent apiCall() invocations.
 *
 * Without this mutex, multiple parallel requests that all receive a 401 at the
 * same moment would each independently attempt a token refresh. The first
 * request would succeed and consume the refresh token (SET NX in Redis), then
 * every subsequent attempt would find the token already revoked and trigger a
 * forced logout — even though the session is perfectly valid.
 *
 * With the mutex, all concurrent callers await the same refresh attempt.
 * The promise resolves to:
 *   true  → refresh succeeded, callers may retry their original request
 *   false → refresh failed, callers should dispatch session-expired
 */
// 'ok' = refresh succeeded | 'expired' = token definitively invalid | 'server-error' = Redis/network/throttle blip
type RefreshResult = 'ok' | 'expired' | 'server-error'
let _refreshPromise: Promise<RefreshResult> | null = null

const attemptTokenRefresh = (apiUrl: string): Promise<RefreshResult> => {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((r): RefreshResult => {
      if (r.ok) return 'ok'
      if (r.status >= 500) return 'server-error' // Redis blip — ne pas déconnecter
      if (r.status === 429) return 'server-error' // Throttle — transitoire, ne pas déconnecter
      return 'expired' // 401/403 → token définitivement invalide
    })
    .catch((): RefreshResult => 'server-error') // erreur réseau — ne pas déconnecter
    .finally(() => {
      _refreshPromise = null
    })

  return _refreshPromise
}

const getApiUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    // In production this means all API calls will fail — set NEXT_PUBLIC_API_URL in your deployment env.
    console.error('[api] NEXT_PUBLIC_API_URL is not set. Falling back to localhost:3001 (dev only).')
    return 'http://localhost:3001/api/v1'
  }
  return url
}

/**
 * Performs an HTTP request against the API.
 *
 * Cookies are sent automatically (credentials: 'include').
 * On a 401 response a silent token refresh is attempted and the request
 * is retried once. The _retry flag prevents infinite refresh loops.
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  _retry = false,
): Promise<Response> => {
  const apiUrl = getApiUrl()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      signal: options.signal ?? controller.signal,
    })

    // Transparent token refresh on 401 (only one retry to avoid infinite loops).
    // All concurrent 401s share the same refresh promise via the mutex —
    // only one actual POST /auth/refresh is sent regardless of how many callers hit 401 at once.
    if (response.status === 401 && !_retry) {
      const result = await attemptTokenRefresh(apiUrl)

      if (result === 'ok') {
        return apiCall(endpoint, options, true)
      }

      // Redis blip ou erreur réseau — on ne déconnecte pas l'utilisateur.
      // La prochaine requête relancera le refresh naturellement.
      if (result === 'server-error') return response

      // Token définitivement invalide → session expirée.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
      }
    }

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
 * Performs an API call and parses the JSON response.
 * Throws an Error with the server message when the response status is not 2xx.
 */
/**
 * Safely extracts a displayable string from any value thrown in an onError handler.
 * Handles ApiError, native Error, plain objects, and primitives — never returns [object Object].
 * Use in every useMutation / useQuery onError callback instead of raw `err.message`.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (err instanceof Error) {
    return typeof err.message === 'string' && err.message ? err.message : fallback
  }
  if (typeof err === 'object') {
    const m = (err as Record<string, unknown>).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}

/** Extracts a safe string from any NestJS error body, never returning [object Object]. */
function extractErrorMessage(error: any, status: number): string {
  if (status === 429) return 'Trop de requêtes. Veuillez patienter quelques instants.'
  // 403 email-verification errors: return a clean message — the AppShell banner
  // already shows how to resend. We fire auth:email-not-verified so the shell
  // can react without exposing internal API paths in the toast.
  if (status === 403) {
    const raw = Array.isArray(error.message) ? error.message[0] : (error.message ?? error.error)
    const text = typeof raw === 'string' ? raw : ''
    if (text.includes('vérifier votre adresse email') || text.includes('email')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:email-not-verified'))
      }
      return 'Veuillez vérifier votre adresse email pour accéder à cette fonctionnalité.'
    }
    return text || `Erreur ${status}`
  }
  const raw = Array.isArray(error.message) ? error.message[0] : (error.message ?? error.error)
  if (!raw) return `Erreur ${status}`
  if (typeof raw === 'string') return raw
  // Object or other non-string value: stringify defensively
  return typeof raw.message === 'string' ? raw.message : `Erreur ${status}`
}

export const apiJson = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await apiCall(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: null }))
    throw new ApiError(extractErrorMessage(error, response.status), response.status)
  }

  return response.json()
}

/**
 * Uploads an image file to Supabase Storage via the backend proxy.
 * Authentication is handled via the access_token HttpOnly cookie.
 *
 * @param file       - File to upload.
 * @param prefix     - Storage path prefix (e.g. 'opportunities', 'avatars').
 * @param resourceId - ID of the owning resource (e.g. opportunityId, userId).
 * @param bucket     - Target bucket name (defaults to 'images').
 * @returns Public URL of the uploaded file.
 */
export const uploadImage = async (
  file: File,
  prefix: string,
  resourceId: string,
  bucket?: string,
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('prefix', prefix)
  formData.append('resourceId', resourceId)
  if (bucket) {
    formData.append('bucket', bucket)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(`${getApiUrl()}/storage/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Upload timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Creates a new opportunity. */
export const createOpportunity = async (data: CreateOpportunityData) => {
  return apiJson('/opportunities', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
