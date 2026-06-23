// ARCH-001 through ARCH-005: hostname-based tenant resolution.
// Reads the request hostname, looks up tenant_domains (with branding),
// and forwards resolved context downstream via request headers so Server
// Components and route handlers never need to re-query.
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Service-role client for the hot-path tenant lookup.
// proxy.ts runs in the Next.js middleware environment (no cookies context).
// Returns null when Supabase env vars are unavailable so the proxy can
// degrade gracefully to the home marketplace instead of crashing.
function createProxyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? request.nextUrl.hostname
  // Strip port so `localhost:3000` and `cleaning.localhost:3000` both resolve.
  const domain = hostname.split(':')[0]

  const supabase = createProxyClient()

  // No Supabase config available in this environment: forward the request
  // and treat it as the home marketplace (no tenant headers), but still pass
  // through the visitor's geo city for the nav.
  if (!supabase) {
    const headers = new Headers(request.headers)
    const ipCity = request.headers.get('x-vercel-ip-city')
    if (ipCity) {
      try {
        headers.set('x-user-city', decodeURIComponent(ipCity))
      } catch {
        headers.set('x-user-city', ipCity)
      }
    }
    return NextResponse.next({ request: { headers } })
  }

  const { data: tenant } = await supabase
    .from('tenant_domains')
    .select('id, domain, category_id, category:provider_categories(id, slug, name), branding:tenant_branding(site_name, logo_url, theme_color)')
    .eq('domain', domain)
    .single()

  const requestHeaders = new Headers(request.headers)

  // Forward the visitor's geo city (set by Vercel's edge network) so the nav
  // can surface "providers near you" instead of a hardcoded city. Decoded
  // because Vercel URL-encodes city names with spaces/accents.
  const ipCity = request.headers.get('x-vercel-ip-city')
  if (ipCity) {
    try {
      requestHeaders.set('x-user-city', decodeURIComponent(ipCity))
    } catch {
      requestHeaders.set('x-user-city', ipCity)
    }
  }

  if (tenant) {
    // ARCH-002/003: attach resolved category filter (null = home marketplace per TEN-005)
    if (tenant.category_id && tenant.category) {
      const cat = Array.isArray(tenant.category) ? tenant.category[0] : tenant.category
      if (cat) {
        requestHeaders.set('x-tenant-category-id', cat.id)
        requestHeaders.set('x-tenant-category-slug', cat.slug)
      }
    }
    if (tenant.branding) {
      const branding = Array.isArray(tenant.branding) ? tenant.branding[0] : tenant.branding
      if (branding) {
        requestHeaders.set('x-tenant-site-name', branding.site_name)
        if (branding.logo_url) requestHeaders.set('x-tenant-logo-url', branding.logo_url)
        if (branding.theme_color) requestHeaders.set('x-tenant-theme-color', branding.theme_color)
      }
    }
  }
  // Unknown domain: treat as home marketplace (no headers set = no category filter).

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
