import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderCertificatePdf, renderDecalPdf, renderStickerPdf } from '@/lib/print-kit/render'

const params = {
  businessName: 'Aya Electrical Services',
  tiers: ['contact', 'google', 'cipc'] as const,
  qr: null,
  profileUrl: 'https://servicepros.co.za/providers/aya-electrical-services?src=qr_certificate',
  recognizedSince: '2026-08-01T10:30:00.000Z',
  verifiedProviderCount: 42,
}

function expectPdf(buffer: Buffer) {
  expect(buffer.length).toBeGreaterThan(500)
  expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF')
}

describe('print-kit PDF renderer', () => {
  it('renders all evangelism kit assets without a browser dependency', async () => {
    expectPdf(await renderDecalPdf(params, { widthMm: 154, heightMm: 216 }))
    expectPdf(await renderCertificatePdf(params, { widthMm: 210, heightMm: 297 }))
    expectPdf(await renderStickerPdf(params, { widthMm: 64, heightMm: 64 }))
  })

  it('does not reintroduce Chromium or Puppeteer imports', () => {
    const source = readFileSync(join(process.cwd(), 'lib/print-kit/render.ts'), 'utf8')

    expect(source).not.toMatch(/puppeteer/i)
    expect(source).not.toMatch(/chromium/i)
    expect(source).toContain("from 'pdf-lib'")
  })

  it('keeps print-kit QR sources distinct for downstream analytics', () => {
    const routeHandler = readFileSync(join(process.cwd(), 'lib/print-kit/route-handler.ts'), 'utf8')
    const profilePage = readFileSync(join(process.cwd(), 'app/(public)/providers/[slug]/page.tsx'), 'utf8')

    expect(routeHandler).toContain("qrSource: 'qr_certificate' | 'qr_decal' | 'qr_sticker'")
    expect(profilePage).toContain("'qr_certificate', 'qr_decal', 'qr_sticker'")
    expect(profilePage).not.toContain("src === 'qr' ? 'qr' : 'site'")
  })
})
