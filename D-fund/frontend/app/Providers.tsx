'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ApiError } from '@/app/lib/api'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 3 minutes before a cached result is considered stale.
        // Reduces refetch frequency on page navigation — most data
        // (profiles, opportunities, community) doesn't change that fast.
        staleTime: 3 * 60 * 1000,
        // Keep unused data in memory for 10 minutes so navigating back to a
        // page doesn't require a fresh network call.
        gcTime: 10 * 60 * 1000,
        // Refetch on window focus only for queries explicitly marked with
        // refetchOnWindowFocus: true (auth, notifications, inbox).
        // Static lists (profiles, opportunities, resources) don't need it —
        // reduces request churn when users switch tabs.
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Never retry hard 4xx errors (bad request, forbidden, not found)
            if (error.status >= 400 && error.status < 500 && error.status !== 429) return false
            // Retry 429 with backoff (max 3 attempts) — let the rate limit window expire
            if (error.status === 429) return failureCount < 3
          }
          return failureCount < 2
        },
        retryDelay: (attemptIndex, error) => {
          // Exponential backoff for 429: 2s, 4s, 8s
          if (error instanceof ApiError && error.status === 429) {
            return Math.min(2000 * 2 ** attemptIndex, 30_000)
          }
          return Math.min(1000 * 2 ** attemptIndex, 10_000)
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
