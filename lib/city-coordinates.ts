/**
 * Typed accessor for config/city-coordinates.json plus the join against live
 * city provider counts (lib/public-data.ts getLocations). Keeps
 * lib/domain/geo-location.ts free of any hardcoded city name — it only
 * receives the already-joined KnownCity[] list built here.
 */

import cityCoordinatesConfig from '@/config/city-coordinates.json'
import type { KnownCity } from '@/lib/domain/geo-location'

const COORDINATES_BY_CITY = new Map(
  cityCoordinatesConfig.cities.map((c) => [c.city.toLowerCase(), { lat: c.lat, lng: c.lng }]),
)

function slugify(city: string): string {
  return city.toLowerCase().replaceAll(' ', '-')
}

/**
 * Joins the live DB-driven city list (name + provider count) against the
 * static coordinate reference table. A live city with no coordinate entry is
 * dropped — it's simply not eligible for distance-based snapping, not an
 * error, since new cities can appear in the DB before this table is updated.
 */
export function toKnownCities(locations: Array<{ city: string; count: number }>): KnownCity[] {
  return locations
    .map((location) => {
      const coords = COORDINATES_BY_CITY.get(location.city.toLowerCase())
      if (!coords) return null
      return {
        city: location.city,
        slug: slugify(location.city),
        lat: coords.lat,
        lng: coords.lng,
        providerCount: location.count,
      }
    })
    .filter((c): c is KnownCity => c !== null)
}
