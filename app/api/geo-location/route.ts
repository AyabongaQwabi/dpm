import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getLocations } from '@/lib/public-data'
import { toKnownCities } from '@/lib/city-coordinates'
import { snapToNearestCity } from '@/lib/domain/geo-location'
import { MIN_TILE_PROVIDERS } from '@/lib/browse-config'
import { USER_CITY_COOKIE } from '@/lib/tenant'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Snaps a browser Geolocation API result to the nearest known city with live
 * providers and persists it as the nav "near you" cookie. Called by
 * components/GeoLocationResolver.tsx after the visitor grants location
 * permission — the API resolves nothing on its own, it just does the
 * snapping/eligibility check the client shouldn't duplicate.
 */
export async function POST(request: Request) {
  let body: { lat?: unknown; lng?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const lat = Number(body.lat)
  const lng = Number(body.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const supabase = await createClient()
  const locations = await getLocations(supabase, 200)
  const knownCities = toKnownCities(locations)
  const snapped = snapToNearestCity({ lat, lng }, knownCities, MIN_TILE_PROVIDERS)

  if (!snapped) {
    return NextResponse.json({ ok: false }, { status: 204 })
  }

  const cookieStore = await cookies()
  cookieStore.set(USER_CITY_COOKIE, snapped.slug, {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax',
  })

  return NextResponse.json({ ok: true, city: snapped.city, slug: snapped.slug })
}
