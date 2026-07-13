import type { Metadata } from 'next'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '')

async function fetchOpportunity(id: string) {
  try {
    const res = await fetch(`${API_BASE}/opportunities/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const opp = await fetchOpportunity(params.id)

  if (!opp) {
    return { title: 'Opportunité introuvable' }
  }

  const title = opp.name ?? 'Opportunité'
  const description = opp.shortDescription ?? opp.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? ''
  const canonical = `https://southconnect.io/opportunities/${params.id}`

  const ogImage = `https://southconnect.io/og?title=${encodeURIComponent(title)}&type=${encodeURIComponent(opp.type ?? '')}&owner=${encodeURIComponent(opp.owner?.name ?? '')}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | SouthConnect`,
      description,
      url: canonical,
      siteName: 'SouthConnect',
      locale: 'fr_FR',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | SouthConnect`,
      description,
      images: [ogImage],
    },
  }
}

function buildJsonLd(opp: any, id: string) {
  const base: Record<string, any> = {
    '@context': 'https://schema.org',
    name: opp.name,
    description: opp.shortDescription ?? opp.description?.replace(/<[^>]*>/g, '').slice(0, 300),
    url: `https://southconnect.io/opportunities/${id}`,
  }

  if (opp.type === 'JOB' || opp.type === 'INTERNSHIP') {
    return {
      ...base,
      '@type': 'JobPosting',
      hiringOrganization: opp.owner?.name ? { '@type': 'Organization', name: opp.owner.name } : undefined,
      jobLocation: opp.location ? { '@type': 'Place', address: opp.location } : undefined,
      datePosted: opp.createdAt,
      validThrough: opp.deadline,
      employmentType: opp.type === 'INTERNSHIP' ? 'INTERN' : 'FULL_TIME',
    }
  }

  return {
    ...base,
    '@type': 'Event',
    organizer: opp.owner?.name ? { '@type': 'Organization', name: opp.owner.name } : undefined,
    location: opp.location ? { '@type': 'Place', name: opp.location } : { '@type': 'VirtualLocation' },
    startDate: opp.deadline,
  }
}

export default async function OpportunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const opp = await fetchOpportunity(params.id)
  const jsonLd = opp ? buildJsonLd(opp, params.id) : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
