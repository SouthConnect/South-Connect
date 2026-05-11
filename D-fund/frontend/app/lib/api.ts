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

    // Transparent token refresh on 401 (only one retry to avoid infinite loops)
    if (response.status === 401 && !_retry) {
      const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => null)

      if (refreshResponse?.ok) {
        return apiCall(endpoint, options, true)
      }

      // 429 on the refresh endpoint means the refresh itself was rate-limited,
      // NOT that the session is expired — keep the user logged in and let them retry.
      if (refreshResponse?.status === 429) {
        return response
      }

      // Any other failure (401, 5xx, network) means the session is definitively expired.
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
export const apiJson = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await apiCall(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    // NestJS validation errors return message as an array; other errors return a string.
    const message = Array.isArray(error.message)
      ? error.message[0]
      : (error.message || error.error || `HTTP ${response.status}`)
    throw new ApiError(message, response.status)
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

  const response = await fetch(`${getApiUrl()}/storage/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.url
}

/** Creates a new opportunity. */
export const createOpportunity = async (data: CreateOpportunityData) => {
  return apiJson('/opportunities', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
