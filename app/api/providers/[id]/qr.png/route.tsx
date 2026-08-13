import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://servicepros.co.za').replace(/\/$/, '')

function filename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'servicepros-provider'
}

function displayNameFor(name: string): string {
  return name.length > 58 ? `${name.slice(0, 55).trim()}...` : name
}

async function qrDataUri(profileUrl: string): Promise<string | null> {
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(profileUrl)}&format=png&size=680&margin=1&dark=0F3329&light=F7F4EF`

  try {
    const response = await fetch(qrUrl, { next: { revalidate: 3600 } })
    if (!response.ok) return null

    const qrBuffer = Buffer.from(await response.arrayBuffer())
    return `data:image/png;base64,${qrBuffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const admin = createAdminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('id, business_name, slug, is_published')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const profileUrl = `${PUBLIC_SITE_URL}/providers/${provider.slug ?? provider.id}?src=qr`
  const qr = await qrDataUri(profileUrl)
  const businessName = displayNameFor(provider.business_name)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EDE6D8',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div
          style={{
            width: 900,
            height: 1100,
            display: 'flex',
            position: 'relative',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '16px solid #07543F',
            borderRadius: 56,
            boxShadow: '0 24px 60px rgba(15, 51, 41, 0.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 22,
              display: 'flex',
              border: '8px solid #D3A52C',
              borderRadius: 38,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -80,
              top: -80,
              width: 230,
              height: 230,
              display: 'flex',
              background: '#0F3329',
              transform: 'rotate(45deg)',
              opacity: 0.12,
            }}
          />
          <div
            style={{
              marginTop: 66,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              color: '#0F3329',
              fontSize: 48,
              fontWeight: 900,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
                background: '#0F3329',
                color: '#F7F4EF',
                fontSize: 48,
                fontWeight: 900,
              }}
            >
              SP
            </div>
            <div style={{ display: 'flex' }}>
              <span>Service</span>
              <span style={{ color: '#D17A12' }}>Pros</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 50,
              color: '#0F3329',
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            Scan to view and book
          </div>
          <div
            style={{
              marginTop: 18,
              color: '#D17A12',
              fontSize: 26,
              fontWeight: 800,
              textAlign: 'center',
            }}
          >
            ServicePros verified profile
          </div>
          <div
            style={{
              marginTop: 34,
              width: 624,
              height: 624,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '10px solid #0F3329',
              borderRadius: 44,
              background: '#FFFFFF',
              boxShadow: '0 18px 42px rgba(15, 51, 41, 0.18)',
            }}
          >
            <div
              style={{
                width: 576,
                height: 576,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 28,
                background: '#F7F4EF',
              }}
            >
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt=""
                  width={540}
                  height={540}
                  style={{
                    width: 540,
                    height: 540,
                    display: 'flex',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 456,
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid #D3A52C',
                    borderRadius: 24,
                    color: '#0F3329',
                    fontSize: 30,
                    fontWeight: 900,
                  }}
                >
                  QR unavailable
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 52,
              maxWidth: 760,
              color: '#0F3329',
              fontSize: businessName.length > 34 ? 34 : 42,
              fontWeight: 900,
              lineHeight: 1.1,
              textAlign: 'center',
            }}
          >
            {businessName}
          </div>
          <div
            style={{
              marginTop: 18,
              color: '#0F3329',
              fontSize: 27,
              fontWeight: 900,
              textAlign: 'center',
            }}
          >
            servicepros.co.za
          </div>
        </div>
      </div>
    ),
    {
      width: 900,
      height: 1100,
      headers: {
        'Content-Disposition': `attachment; filename="${filename(provider.business_name)}-servicepros-qr.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
