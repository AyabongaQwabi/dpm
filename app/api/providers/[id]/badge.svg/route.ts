import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function filename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'servicepros-provider'
}

function fontSizeFor(name: string): number {
  if (name.length > 64) return 40
  if (name.length > 48) return 48
  if (name.length > 34) return 58
  return 72
}

async function templateDataUri() {
  const file = await readFile(path.join(process.cwd(), 'public/images/badges/servicepros-provider-badge-template.png'))
  return `data:image/png;base64,${file.toString('base64')}`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const admin = createAdminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('id, business_name, slug, verified_contact, verified_google, verified_cipc, verified_fica, is_published')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const template = await templateDataUri()
  const fontSize = fontSizeFor(provider.business_name)
  const name = escapeXml(provider.business_name)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1731" height="909" viewBox="0 0 1731 909" role="img" aria-label="ServicePros provider badge for ${name}">
  <image href="${template}" width="1731" height="909"/>
  <text x="1118" y="475" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="#0F3329">${name}</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename(provider.business_name)}-servicepros-badge.svg"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
