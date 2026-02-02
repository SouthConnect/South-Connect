import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/app/lib/AuthContext'
import Sidebar from '@/components/Sidebar'
import Providers from './Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'D-Fund - Connecter les entrepreneurs africains',
  description: 'Plateforme connectant les entrepreneurs africains à leurs ressources: talents, outils, mentors, accompagnements et investisseurs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          <Providers>
            <div className="flex min-h-screen bg-gray-50">
              <Sidebar />
              <div className="flex-1 ml-64 flex flex-col min-h-screen">
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </div>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
