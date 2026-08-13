import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { loadOgImageFonts } from '@/lib/og-image/fonts'
import { OgBadgeRow, heldTiers } from '@/lib/og-image/badge-row'
import { BRAND_COLORS, BRAND_WORDMARK } from '@/lib/brand-config'

export const runtime = 'nodejs'
export const alt = 'ServicePros provider profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function fontSizeFor(name: string): number {
  if (name.length > 46) return 48
  if (name.length > 30) return 60
  return 72
}

async function getProvider(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select('business_name, location_city, google_rating, google_rating_count, verified_contact, verified_google, verified_cipc, verified_fica')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .eq('is_published', true)
    .maybeSingle()
  return data
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const provider = await getProvider(slug)
  const fonts = await loadOgImageFonts()
  const { colors, wordmark } = { colors: BRAND_COLORS, wordmark: BRAND_WORDMARK }

  const businessName = provider?.business_name ?? 'ServicePros provider'
  const tiers = provider
    ? heldTiers({
        contact: provider.verified_contact,
        google: provider.verified_google,
        cipc: provider.verified_cipc,
        fica: provider.verified_fica,
      })
    : []

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: colors.paper,
          fontFamily: 'Hanken Grotesk, sans-serif',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: colors.primary,
              color: '#fff',
              fontFamily: 'Bricolage Grotesque, sans-serif',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            SP
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: colors.accent }}>{wordmark}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Bricolage Grotesque, sans-serif',
              fontWeight: 800,
              fontSize: fontSizeFor(businessName),
              color: colors.ink,
              lineHeight: 1.1,
              maxWidth: 980,
            }}
          >
            {businessName}
          </div>
          {provider?.location_city ? (
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: colors.ink, opacity: 0.75 }}>
              {provider.location_city}
              {provider.google_rating ? ` · ★ ${provider.google_rating.toFixed(1)} (${provider.google_rating_count ?? 0})` : ''}
            </div>
          ) : null}
          <OgBadgeRow tiers={tiers} ink={colors.ink} />
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
