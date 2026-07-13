import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recherche',
  description: 'Recherchez des opportunités, profils et discussions sur SouthConnect.',
  robots: { index: false },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
