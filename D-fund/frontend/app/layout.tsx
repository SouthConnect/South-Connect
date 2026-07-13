import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/app/lib/AuthContext'
import AppShell from '@/components/AppShell'
import Providers from './Providers'
import { Toaster } from 'sonner'
import NextTopLoader from 'nextjs-toploader'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#3b49df',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'SouthConnect - La plateforme tout-en-un pour les entrepreneurs africains',
    template: '%s | SouthConnect',
  },
  description: "Connectez-vous avec des investisseurs, trouvez des co-fondateurs, accédez aux talents et aux opportunités de financement, tout en un seul endroit pour l'écosystème startup africain.",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SouthConnect',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'SouthConnect - La plateforme tout-en-un pour les entrepreneurs africains',
    description: "Connectez-vous avec des investisseurs, trouvez des co-fondateurs, accédez aux talents et opportunités de financement.",
    url: 'https://southconnect.io',
    siteName: 'SouthConnect',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: 'https://southconnect.io/og-default.png', width: 1200, height: 630, alt: 'SouthConnect' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SouthConnect',
    description: "La plateforme tout-en-un pour les entrepreneurs africains.",
    images: ['https://southconnect.io/og-default.png'],
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
        <NextTopLoader color="#3b49df" showSpinner={false} height={3} shadow="0 0 10px #3b49df,0 0 5px #3b49df" />
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
