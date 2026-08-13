import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

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
    .select('id, business_name, verified_contact, verified_google, verified_cipc, verified_fica, is_published')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const template = await templateDataUri()
  const fontSize = fontSizeFor(provider.business_name)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'Arial, Helvetica, sans-serif',
          position: 'relative',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template}
          alt=""
          width="1731"
          height="909"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 596,
            top: 354,
            width: 1044,
            height: 208,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#0F3329',
            fontSize,
            lineHeight: 1.08,
            fontWeight: 900,
            padding: '0 46px',
            letterSpacing: -1,
          }}
        >
          {provider.business_name}
        </div>
      </div>
    ),
    {
      width: 1731,
      height: 909,
      headers: {
        'Content-Disposition': `attachment; filename="${filename(provider.business_name)}-servicepros-badge.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
