// Shared "fetch provider, gate, render PDF" flow for the three print-kit
// route handlers (decal, certificate, sticker). Each route supplies only its
// own HTML template function; fetch/gate/render/response plumbing lives here
// once so the three routes can't drift on the eligibility check.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { providerHasPrintEligibility } from '@/lib/domain/print-kit'
import { heldTiers } from '@/lib/print-kit/badges'
import { loadPrintKitFonts, fontFaceCss } from '@/lib/print-kit/fonts'
import { renderHtmlToPdf, type PdfSize } from '@/lib/print-kit/render'
import type { VerificationTier } from '@/components/ui/VerifiedBadge'

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://servicepros.co.za').replace(/\/$/, '')

export function slugFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'servicepros-provider'
}

export async function qrDataUri(profileUrl: string, size = 480): Promise<string | null> {
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(profileUrl)}&format=png&size=${size}&margin=1&dark=0F3329&light=FFFFFF`
  try {
    const response = await fetch(qrUrl, { next: { revalidate: 3600 } })
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

interface ProviderRow {
  id: string
  business_name: string
  slug: string | null
  claim_status: string | null
  verified_contact: boolean | null
  verified_google: boolean | null
  verified_cipc: boolean | null
  verified_fica: boolean | null
}

interface RenderPrintKitPdfOptions {
  size: PdfSize
  filenameSuffix: string
  buildHtml: (params: {
    businessName: string
    tiers: VerificationTier[]
    qr: string | null
    profileUrl: string
    fontCss: string
  }) => string
  qrSize?: number
}

export async function handlePrintKitPdfRequest(
  providerId: string,
  options: RenderPrintKitPdfOptions,
): Promise<NextResponse> {
  const admin = createAdminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('id, business_name, slug, is_published, claim_status, verified_contact, verified_google, verified_cipc, verified_fica')
    .eq('id', providerId)
    .eq('is_published', true)
    .maybeSingle<ProviderRow>()

  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!providerHasPrintEligibility(provider)) {
    return NextResponse.json({ error: 'Profile must be claimed and hold at least one badge' }, { status: 403 })
  }

  const tiers = heldTiers({
    contact: provider.verified_contact,
    google: provider.verified_google,
    cipc: provider.verified_cipc,
    fica: provider.verified_fica,
  })
  const profileUrl = `${PUBLIC_SITE_URL}/providers/${provider.slug ?? provider.id}?src=qr`

  try {
    const [fonts, qr] = await Promise.all([loadPrintKitFonts(), qrDataUri(profileUrl, options.qrSize)])

    const html = options.buildHtml({
      businessName: provider.business_name,
      tiers,
      qr,
      profileUrl,
      fontCss: fontFaceCss(fonts),
    })

    const pdf = await renderHtmlToPdf(html, options.size)

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slugFilename(provider.business_name)}-${options.filenameSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('print-kit PDF render failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
