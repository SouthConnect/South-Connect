import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SouthConnect',
    short_name: 'SouthConnect',
    description: "La plateforme tout-en-un pour les entrepreneurs africains",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b49df',
    lang: 'fr',
    categories: ['business', 'productivity', 'social'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
  }
}
