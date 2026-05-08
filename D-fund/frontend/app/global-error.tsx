'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Next.js global error boundary — wraps the root layout.
 * Sentry captures the error before the fallback UI is shown.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Une erreur inattendue s&apos;est produite
          </h2>
          <p className="text-gray-500 mb-4 text-sm">
            L&apos;équipe a été notifiée automatiquement.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
