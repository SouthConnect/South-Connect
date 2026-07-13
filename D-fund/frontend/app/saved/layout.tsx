import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Opportunités sauvegardées',
  description: 'Retrouvez toutes les opportunités que vous avez sauvegardées sur SouthConnect.',
  robots: { index: false },
}

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
