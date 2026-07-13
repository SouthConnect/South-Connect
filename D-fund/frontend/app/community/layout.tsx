import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Communauté',
  description: 'Rejoignez la communauté SouthConnect : échangez, posez vos questions et collaborez avec des entrepreneurs et professionnels de la diaspora africaine.',
  openGraph: {
    title: 'Communauté | SouthConnect',
    description: 'Échangez et collaborez avec des entrepreneurs et professionnels de la diaspora africaine.',
    url: 'https://southconnect.io/community',
  },
  alternates: { canonical: 'https://southconnect.io/community' },
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
