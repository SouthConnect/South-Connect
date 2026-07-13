import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explorer les opportunités',
  description: 'Découvrez des bourses, stages, emplois, concours et financements pour entrepreneurs africains et de la diaspora sur SouthConnect.',
  openGraph: {
    title: 'Explorer les opportunités | SouthConnect',
    description: 'Bourses, stages, emplois, concours et financements pour la diaspora africaine.',
    url: 'https://southconnect.io/explore',
  },
  alternates: { canonical: 'https://southconnect.io/explore' },
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
