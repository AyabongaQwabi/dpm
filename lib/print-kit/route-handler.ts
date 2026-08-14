// Shared "fetch provider, gate, render PDF" flow for the three print-kit
// route handlers (decal, certificate, sticker). Each route supplies only its
// own pure-PDF render function; fetch/gate/render/response plumbing lives here
// once so the three routes can't drift on the eligibility check.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { providerHasPrintEligibility } from '@/lib/domain/print-kit'
import { heldTiers } from '@/lib/print-kit/badges'
import type { PdfSize, PrintKitRenderParams } from '@/lib/print-kit/render'

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
  renderPdf: (params: PrintKitRenderParams, size: PdfSize) => Promise<Buffer>
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
    const qr = await qrDataUri(profileUrl, options.qrSize)
    const pdf = await options.renderPdf(
      {
        businessName: provider.business_name,
        tiers,
        qr,
        profileUrl,
      },
      options.size,
    )

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slugFilename(provider.business_name)}-${options.filenameSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('print-kit PDF generation failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
