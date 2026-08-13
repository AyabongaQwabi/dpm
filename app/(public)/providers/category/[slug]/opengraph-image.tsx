import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getPublishedProvidersPage, titleFromSlug } from '@/lib/public-data'
import { loadOgImageFonts } from '@/lib/og-image/fonts'
import { BRAND_COLORS, BRAND_WORDMARK } from '@/lib/brand-config'

export const runtime = 'nodejs'
export const alt = 'ServicePros category'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { total } = await getPublishedProvidersPage(supabase, { categorySlug: slug, page: 1, pageSize: 1 })
  const fonts = await loadOgImageFonts()
  const { colors, wordmark } = { colors: BRAND_COLORS, wordmark: BRAND_WORDMARK }
  const category = titleFromSlug(slug)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: colors.primary,
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
              background: '#fff',
              color: colors.primary,
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
              fontSize: 64,
              color: '#fff',
              lineHeight: 1.1,
              maxWidth: 980,
            }}
          >
            {category} providers
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: colors.accent }}>
            {total > 0 ? `${total} verified provider${total === 1 ? '' : 's'} in South Africa` : 'South Africa'}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
