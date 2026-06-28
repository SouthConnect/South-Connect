'use client'

import { useMutation, UseMutationOptions, UseMutationResult, DefaultError } from '@tanstack/react-query'
import * as Sentry from '@sentry/nextjs'
import { ApiError } from '@/app/lib/api'

/**
 * Drop-in replacement for useMutation that automatically reports failed mutations
 * to Sentry in production. Client errors (4xx) are NOT reported — they are expected
 * and handled by onError callbacks. Only server errors (5xx) and unexpected exceptions
 * are worth alerting on.
 *
 * Usage: replace `useMutation({...})` with `useTrackedMutation('mutation-name', {...})`
 */
export function useTrackedMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  name: string,
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  type OnErrorFn = NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onError']>

  const wrappedOnError: OnErrorFn = (...args) => {
    const [error] = args

    if (process.env.NODE_ENV === 'production') {
      const status = error instanceof ApiError ? error.status : null

      // 4xx = expected client errors (validation, auth, conflict) — skip
      // 5xx or unknown = unexpected server failure — alert
      if (!status || status >= 500) {
        Sentry.withScope((scope) => {
          scope.setTag('mutation', name)
          scope.setContext('mutation', {
            name,
            status,
            message: error instanceof Error ? error.message : String(error),
          })
          Sentry.captureException(error)
        })
      }
    }

    // Always call the original onError if provided
    options.onError?.(...args)
  }

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onError: wrappedOnError,
  })
}
