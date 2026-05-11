'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'

export default function PrivateChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-gray-800">
        Impossible de charger cette conversation
      </h2>
      <p className="text-gray-500 text-sm max-w-sm">
        La conversation n&apos;existe peut-être plus ou vous n&apos;y avez pas accès.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/chat')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          Retour aux messages
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm hover:bg-[#2f3ab2] transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
