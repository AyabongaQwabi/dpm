import { describe, expect, it } from 'vitest'
import { haversineDistanceKm, resolveNavLocation, snapToNearestCity, type KnownCity } from '../geo-location'

const CAPE_TOWN: KnownCity = { city: 'Cape Town', slug: 'cape-town', lat: -33.9249, lng: 18.4241, providerCount: 305 }
const JOHANNESBURG: KnownCity = { city: 'Johannesburg', slug: 'johannesburg', lat: -26.2041, lng: 28.0473, providerCount: 177 }
const TINY_TOWN: KnownCity = { city: 'Tiny Town', slug: 'tiny-town', lat: -33.9, lng: 18.5, providerCount: 2 }

const KNOWN_CITIES = [CAPE_TOWN, JOHANNESBURG, TINY_TOWN]

describe('haversineDistanceKm', () => {
  it('is zero for identical points', () => {
    expect(haversineDistanceKm({ lat: -33.9249, lng: 18.4241 }, { lat: -33.9249, lng: 18.4241 })).toBe(0)
  })

  it('roughly matches the known Cape Town <-> Johannesburg distance (~1270km)', () => {
    const km = haversineDistanceKm(
      { lat: CAPE_TOWN.lat, lng: CAPE_TOWN.lng },
      { lat: JOHANNESBURG.lat, lng: JOHANNESBURG.lng },
    )
    expect(km).toBeGreaterThan(1200)
    expect(km).toBeLessThan(1350)
  })
})

describe('snapToNearestCity', () => {
  it('snaps a coordinate near Cape Town to Cape Town over farther Johannesburg', () => {
    const result = snapToNearestCity({ lat: -33.9, lng: 18.5 }, KNOWN_CITIES, 5)
    expect(result?.slug).toBe('cape-town')
  })

  it('never returns a city below the minimum provider threshold, even if nearest by distance', () => {
    // TINY_TOWN is geographically closer to this point than Cape Town, but
    // has only 2 providers — below the min_tile_providers=5 threshold, so it
    // must never be the resolved nav destination (would dead-end into an
    // empty listing).
    const result = snapToNearestCity({ lat: -33.9, lng: 18.5 }, KNOWN_CITIES, 5)
    expect(result?.slug).not.toBe('tiny-town')
  })

  it('returns null when every known city is below the threshold', () => {
    const result = snapToNearestCity({ lat: -33.9, lng: 18.5 }, [TINY_TOWN], 5)
    expect(result).toBeNull()
  })

  it('returns null for an empty known-city list', () => {
    expect(snapToNearestCity({ lat: -33.9, lng: 18.5 }, [], 5)).toBeNull()
  })
})

describe('resolveNavLocation — fallback order', () => {
  const base = {
    cookieCitySlug: null,
    ipCountry: null as string | null,
    ipCoordinates: null as { lat: number; lng: number } | null,
    knownCities: KNOWN_CITIES,
    minTileProviders: 5,
    defaultCitySlug: 'cape-town',
  }

  it('prefers an explicit cookie selection over everything else', () => {
    const result = resolveNavLocation({
      ...base,
      cookieCitySlug: 'johannesburg',
      ipCountry: 'ZA',
      ipCoordinates: { lat: CAPE_TOWN.lat, lng: CAPE_TOWN.lng },
    })
    expect(result?.slug).toBe('johannesburg')
  })

  it('ignores a cookie for a city outside the known-city list', () => {
    const result = resolveNavLocation({ ...base, cookieCitySlug: 'made-up-city' })
    expect(result?.slug).toBe('cape-town') // falls through to default
  })

  it('snaps IP geolocation coordinates when ZA and no cookie is set', () => {
    const result = resolveNavLocation({
      ...base,
      ipCountry: 'ZA',
      ipCoordinates: { lat: JOHANNESBURG.lat, lng: JOHANNESBURG.lng },
    })
    expect(result?.slug).toBe('johannesburg')
  })

  it('a non-ZA IP geolocation result falls through to the configured default, never rendering the raw non-ZA coordinate match', () => {
    const result = resolveNavLocation({
      ...base,
      ipCountry: 'US',
      ipCoordinates: { lat: JOHANNESBURG.lat, lng: JOHANNESBURG.lng },
    })
    expect(result?.slug).toBe('cape-town')
  })

  it('a zero/below-threshold-provider nearest match falls through to the configured default', () => {
    const result = resolveNavLocation({
      ...base,
      knownCities: [TINY_TOWN],
      ipCountry: 'ZA',
      ipCoordinates: { lat: TINY_TOWN.lat, lng: TINY_TOWN.lng },
      defaultCitySlug: 'tiny-town',
    })
    // TINY_TOWN has 2 providers, below the 5 threshold — even as the
    // configured default it must not render, so this resolves to null
    // rather than a dead-end "near you" link.
    expect(result).toBeNull()
  })

  it('resolves to null (neutral "Near you" label) when nothing resolves at all', () => {
    const result = resolveNavLocation({ ...base, defaultCitySlug: 'nonexistent-city' })
    expect(result).toBeNull()
  })
})
