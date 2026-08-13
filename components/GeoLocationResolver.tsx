'use client'

// Fires once per visitor (gated by whether the "near you" cookie already
// exists — checked server-side, passed down as a prop) to ask the browser
// Geolocation API for coordinates, then hands them to /api/geo-location for
// nearest-known-city snapping. Silent no-op on denial/error/unsupported
// browsers — the nav already has an IP-geolocation or default-city fallback
// (lib/tenant.ts getUserLocation), so this is a pure upgrade, never blocking.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function GeoLocationResolver({ hasStoredLocation }: { hasStoredLocation: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (hasStoredLocation) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetch('/api/geo-location', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.ok) router.refresh()
          })
          .catch(() => {})
      },
      () => {},
      { maximumAge: 600_000, timeout: 5_000 },
    )
  }, [hasStoredLocation, router])

  return null
}
