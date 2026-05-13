import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/app/lib/AuthContext'
import AppShell from '@/components/AppShell'
import Providers from './Providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'D-Fund - La plateforme tout-en-un pour les entrepreneurs africains',
  description: "Connectez-vous avec des investisseurs, trouvez des co-fondateurs, accédez aux talents et opportunités de financement — tout en un seul endroit pour l'écosystème startup africain.",
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'D-Fund - La plateforme tout-en-un pour les entrepreneurs africains',
    description: "Connectez-vous avec des investisseurs, trouvez des co-fondateurs, accédez aux talents et opportunités de financement.",
    url: 'https://d-fund.co',
    siteName: 'D-Fund',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'D-Fund',
    description: "La plateforme tout-en-un pour les entrepreneurs africains.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="bottom-right" richColors closeButton />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
