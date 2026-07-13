import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

const TYPE_LABELS: Record<string, string> = {
  JOB_OPPORTUNITY: 'Emploi',
  TALENT_PROFILE: 'Talent',
  CO_FOUNDER_OPPORTUNITY: 'Co-fondateur',
  CO_FOUNDER_PROFILE: 'Co-fondateur',
  BUSINESS_IDEA: 'Idée business',
  SUPPORT_OFFER: 'Offre de soutien',
  SERVICE_LISTING: 'Service',
  SERVICE_REQUEST: 'Demande de service',
  DEAL_FLOW: 'Deal Flow',
  INVESTOR_THESIS: 'Thèse investisseur',
  INVESTOR_PROFILE: 'Investisseur',
  FUNDING_OPPORTUNITY: 'Financement',
  EVENT: 'Événement',
  CALL_FOR_STARTUPS: 'Appel à startups',
  MENTORSHIP_BA_OFFER: 'Mentorship',
  PROJECT_SEEKING_SUPPORT: 'Projet',
  VENTURE_PROGRAM: 'Programme',
  CHILL_WORK_SPOT: 'Espace de travail',
  MARKET_ADVISOR: 'Conseiller marché',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'SouthConnect'
  const rawType = searchParams.get('type') ?? ''
  const owner = searchParams.get('owner') ?? ''
  const typeLabel = TYPE_LABELS[rawType] ?? rawType.replace(/_/g, ' ')

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          padding: '60px 70px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '48px' }}>
          <div
            style={{
              width: '52px', height: '52px', borderRadius: '12px',
              backgroundColor: '#3b49df', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontSize: '30px', fontWeight: 800,
            }}
          >
            S
          </div>
          <span style={{ marginLeft: '14px', fontSize: '24px', fontWeight: 700, color: '#3b49df' }}>
            SouthConnect
          </span>
        </div>

        {/* Type badge */}
        {typeLabel && (
          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <span
              style={{
                fontSize: '14px', fontWeight: 700, color: '#3b49df',
                backgroundColor: '#eff1ff', padding: '6px 16px',
                borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '1.5px',
              }}
            >
              {typeLabel}
            </span>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 60 ? '38px' : title.length > 40 ? '46px' : '54px',
            fontWeight: 800, color: '#111827', lineHeight: 1.2, flex: 1,
          }}
        >
          {title.length > 80 ? `${title.slice(0, 80)}…` : title}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '40px' }}>
          {owner && (
            <span style={{ fontSize: '18px', color: '#6b7280' }}>
              par {owner}
            </span>
          )}
          <span style={{ fontSize: '16px', color: '#9ca3af', marginLeft: 'auto' }}>
            southconnect.io
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
