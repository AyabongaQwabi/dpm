/**
 * Nearest-known-city resolution for the nav "near you" item. Pure — no DB,
 * no framework imports (ARCH-006). The known-city list (name + coordinates)
 * is assembled by the caller from the DB-driven city list
 * (lib/public-data.ts getLocations) joined against a static SA coordinate
 * reference table (config/city-coordinates.json) — this module never
 * hardcodes city names itself, only the distance math.
 */

export interface KnownCity {
  city: string
  slug: string
  lat: number
  lng: number
  providerCount: number
}

export interface Coordinates {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two points, in kilometres. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Nearest city in the known-city list with at least `minTileProviders`
 * providers, or null if the list is empty or every city is below threshold.
 * A city with zero (or below-threshold) live providers must never be
 * returned — the nav link would dead-end into an empty listing.
 */
export function snapToNearestCity(
  point: Coordinates,
  knownCities: KnownCity[],
  minTileProviders: number,
): KnownCity | null {
  const eligible = knownCities.filter((c) => c.providerCount >= minTileProviders)
  if (eligible.length === 0) return null

  return eligible.reduce((nearest, candidate) => {
    const nearestDist = haversineDistanceKm(point, nearest)
    const candidateDist = haversineDistanceKm(point, candidate)
    return candidateDist < nearestDist ? candidate : nearest
  })
}

export interface ResolveNavLocationInput {
  cookieCitySlug: string | null
  ipCountry: string | null
  ipCoordinates: Coordinates | null
  knownCities: KnownCity[]
  minTileProviders: number
  defaultCitySlug: string
}

/**
 * Pure priority-chain decision for the nav "near you" item — see
 * lib/tenant.ts getUserLocation() for the IO wrapper (headers/cookies/DB)
 * around this. Kept pure so the fallback behavior (never a non-ZA result,
 * never a below-threshold city) is directly testable without mocking
 * Next.js request APIs.
 */
export function resolveNavLocation(input: ResolveNavLocationInput): { city: string; slug: string } | null {
  const eligible = new Map(
    input.knownCities
      .filter((c) => c.providerCount >= input.minTileProviders)
      .map((c) => [c.slug, { city: c.city, slug: c.slug }]),
  )

  if (input.cookieCitySlug && eligible.has(input.cookieCitySlug)) {
    return eligible.get(input.cookieCitySlug)!
  }

  if (input.ipCountry === 'ZA' && input.ipCoordinates) {
    const snapped = snapToNearestCity(input.ipCoordinates, input.knownCities, input.minTileProviders)
    if (snapped) return { city: snapped.city, slug: snapped.slug }
  }

  if (eligible.has(input.defaultCitySlug)) {
    return eligible.get(input.defaultCitySlug)!
  }

  return null
}
