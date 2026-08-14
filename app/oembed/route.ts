import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/seo'
import { embedCorsHeaders } from '@/lib/embed-cors'
import { EMBED_WIDGET_DATA_MAX_AGE_SECONDS } from '@/lib/embed-config'

export const runtime = 'nodejs'

const CARD_WIDTH = 360
const CARD_HEIGHT = 220

function jsonWithCors(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...embedCorsHeaders(),
      'Cache-Control': `public, max-age=${EMBED_WIDGET_DATA_MAX_AGE_SECONDS}`,
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: embedCorsHeaders() })
}

/** Extracts the slug-or-id path segment from a /providers/{slug} profile URL on this site. */
function providerPathFromUrl(rawUrl: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  let site: URL
  try {
    site = new URL(SITE_URL)
  } catch {
    return null
  }
  if (parsed.hostname.replace(/^www\./, '') !== site.hostname.replace(/^www\./, '')) return null

  const match = parsed.pathname.match(/^\/providers\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const maxWidth = Number(searchParams.get('maxwidth')) || CARD_WIDTH
  const maxHeight = Number(searchParams.get('maxheight')) || CARD_HEIGHT

  if (!url) {
    return jsonWithCors({ error: 'Missing url parameter' }, 400)
  }

  const providerPath = providerPathFromUrl(url)
  if (!providerPath) {
    return jsonWithCors({ error: 'Unrecognized url' }, 404)
  }

  const admin = createAdminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('id, business_name, is_published, subscription:provider_subscriptions(status)')
    .or(`slug.eq.${providerPath},id.eq.${providerPath}`)
    .eq('is_published', true)
    .maybeSingle()

  if (!provider) {
    return jsonWithCors({ error: 'Not found' }, 404)
  }

  const activeSubscription = (Array.isArray(provider.subscription) ? provider.subscription : [provider.subscription])
    .filter(Boolean)
    .some((sub) => (sub as { status: string } | null)?.status === 'active')

  if (!activeSubscription) {
    return jsonWithCors({ error: 'unavailable', reason: 'subscription_inactive' }, 200)
  }

  const width = Math.min(maxWidth, CARD_WIDTH) || CARD_WIDTH
  const height = Math.min(maxHeight, CARD_HEIGHT) || CARD_HEIGHT

  // Self-contained snippet reusing the existing script-tag runtime — the
  // same markup a provider would hand-paste, auto-generated here. This is
  // deliberately not a new rendering path: a consumer that executes
  // returned HTML directly (Notion, WordPress) runs this exactly like any
  // other embed; a consumer that sandboxes it in its own iframe is making
  // that choice itself, not something this endpoint needs to accommodate.
  const html = `<div class="sp-embed-oembed" style="max-width:${width}px"><script src="${SITE_URL}/embed/v1.js" data-provider="${provider.id}" data-mode="card" async></script></div>`

  return jsonWithCors({
    type: 'rich',
    version: '1.0',
    provider_name: 'ServicePros',
    provider_url: SITE_URL,
    title: provider.business_name,
    html,
    width,
    height,
  })
}
