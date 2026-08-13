import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://servicepros.co.za').replace(/\/$/, '')

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function dataUriForSvg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function filename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'servicepros-provider'
}

function brandedQrSvg(name: string, qrSvg: string | null) {
  const qrImage = qrSvg
    ? `<image href="${dataUriForSvg(qrSvg)}" x="180" y="310" width="540" height="540" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="222" y="395" width="456" height="120" rx="24" fill="#F7F4EF" stroke="#D3A52C" stroke-width="4"/>
  <text x="450" y="446" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#0F3329">QR unavailable</text>
  <text x="450" y="490" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#36554B">Try again in a moment</text>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100" role="img" aria-label="ServicePros profile QR code for ${escapeXml(name)}">
  <defs>
    <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#F5D675"/>
      <stop offset="0.55" stop-color="#D3A52C"/>
      <stop offset="1" stop-color="#A97710"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0F3329" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="900" height="1100" rx="56" fill="#F7F4EF"/>
  <rect x="30" y="30" width="840" height="1040" rx="42" fill="#FFFFFF" stroke="#07543F" stroke-width="16"/>
  <rect x="54" y="54" width="792" height="992" rx="30" fill="none" stroke="url(#gold)" stroke-width="8"/>
  <circle cx="450" cy="132" r="54" fill="#0F3329"/>
  <path d="M423 131l18 18 39-48" fill="none" stroke="#F7F4EF" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="450" y="230" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="900" fill="#0F3329">Scan to view and book</text>
  <text x="450" y="278" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" fill="#D17A12">ServicePros verified profile</text>
  <rect x="138" y="292" width="624" height="624" rx="44" fill="#FFFFFF" stroke="#0F3329" stroke-width="10" filter="url(#shadow)"/>
  <rect x="162" y="316" width="576" height="576" rx="28" fill="#F7F4EF"/>
  ${qrImage}
  <text x="450" y="976" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="900" fill="#0F3329">${escapeXml(name)}</text>
  <text x="450" y="1020" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#0F3329">servicepros.co.za</text>
</svg>`
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
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(profileUrl)}&format=svg&size=640&margin=1&dark=0F3329&light=F7F4EF`

  let svg = ''
  try {
    const response = await fetch(qrUrl, { next: { revalidate: 3600 } })
    if (response.ok) svg = await response.text()
  } catch {
    svg = ''
  }

  const brandedSvg = brandedQrSvg(provider.business_name, svg.includes('<svg') ? svg : null)

  return new NextResponse(brandedSvg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename(provider.business_name)}-servicepros-qr.svg"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
