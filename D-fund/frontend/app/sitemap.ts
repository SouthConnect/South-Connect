import type { MetadataRoute } from 'next'

const BASE_URL = 'https://southconnect.io'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '')

async function fetchAllOpportunities(): Promise<{ id: string; updatedAt: string }[]> {
  const results: { id: string; updatedAt: string }[] = []
  let cursor: string | null = null

  try {
    do {
      const qs = `status=ACTIVE&take=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      const res = await fetch(`${API_BASE}/opportunities?${qs}`, { next: { revalidate: 3600 } })
      if (!res.ok) break

      const data: { data: { id: string; updatedAt: string }[]; nextCursor?: string | null } = await res.json()
      for (const opp of data.data ?? []) results.push({ id: opp.id, updatedAt: opp.updatedAt })
      cursor = data.nextCursor ?? null
    } while (cursor)
  } catch {
    // Best-effort — return what we have so far
  }

  return results
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const opportunities = await fetchAllOpportunities()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/explore`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/community`,     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/features`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/login`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/register`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/contact`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE_URL}/terms`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ]

  const opportunityRoutes: MetadataRoute.Sitemap = opportunities.map(({ id, updatedAt }) => ({
    url: `${BASE_URL}/opportunities/${id}`,
    lastModified: new Date(updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...opportunityRoutes]
}
