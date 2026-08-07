'use client'

import { useAuth } from '@/app/lib/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'

interface AuthGuardProps {
  children: React.ReactNode
  /** Skeleton affiché pendant la résolution de l'auth. Défaut : 4 lignes pulse. */
  skeleton?: React.ReactNode
  /** Message sur l'écran "connexion requise". */
  message?: string
}

/**
 * Composant unique qui gère le guard d'authentification.
 *
 * Remplace le pattern dupliqué sur toutes les pages :
 *   if (authLoading) return <Skeleton />
 *   if (!user) return <SignInPrompt />
 *
 * Usage :
 *   <AuthGuard message="Connectez-vous pour accéder à cette page.">
 *     <PageContent />
 *   </AuthGuard>
 *
 * Le contenu n'est rendu QUE si l'utilisateur est authentifié.
 * Les hooks dans les children (useQuery, etc.) doivent utiliser enabled: !!user?.id
 * pour ne pas déclencher de requêtes inutiles.
 */
export default function AuthGuard({ children, skeleton, message }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return <>{skeleton ?? <DefaultAuthSkeleton />}</>
  }

  if (!user) {
    return <SignInRequired message={message} redirect={pathname} />
  }

  return <>{children}</>
}

/**
 * Skeleton générique utilisé par défaut pendant le chargement de l'auth.
 * Chaque page peut passer son propre skeleton via la prop `skeleton`.
 */
function DefaultAuthSkeleton() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * Écran "connexion requise" standardisé.
 * Exporté pour usage standalone si besoin.
 */
export function SignInRequired({ message, redirect }: { message?: string; redirect?: string | null }) {
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <LogIn className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-gray-600 font-semibold mb-1">Connexion requise</p>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        {message ?? 'Connectez-vous pour accéder à cette page.'}
      </p>
      <Link
        href={loginHref}
        className="px-6 py-2.5 bg-[#3b49df] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3aba] transition-colors"
      >
        Se connecter
      </Link>
    </div>
  )
}
