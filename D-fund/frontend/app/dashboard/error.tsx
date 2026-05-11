'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-gray-800">
        Impossible de charger le tableau de bord
      </h2>
      <p className="text-gray-500 text-sm max-w-sm">
        Une erreur est survenue lors du chargement de vos données.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm hover:bg-[#2f3ab2] transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
