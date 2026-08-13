// ARCH-003/005: tenant context resolution helpers.
// Server Components and route handlers call getTenantContext() to get the
// category filter and branding already resolved by the proxy. No re-query needed.
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getLocations } from "@/lib/public-data";
import { toKnownCities } from "@/lib/city-coordinates";
import { resolveNavLocation } from "@/lib/domain/geo-location";
import { MIN_TILE_PROVIDERS, DEFAULT_CITY } from "@/lib/browse-config";

/** Cookie holding an explicit, user-selected city slug for the nav "near you" item. */
export const USER_CITY_COOKIE = "sp_user_city";

export interface TenantBranding {
  siteName: string;
  logoUrl: string | null;
  themeColor: string | null;
}

export interface TenantContext {
  // null means home marketplace — no category filter applied (TEN-005)
  categoryId: string | null;
  categorySlug: string | null;
  branding: TenantBranding | null;
  isHomeMarketplace: boolean;
}

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers();

  const categoryId = h.get("x-tenant-category-id");
  const categorySlug = h.get("x-tenant-category-slug");
  const siteName = h.get("x-tenant-site-name");
  const logoUrl = h.get("x-tenant-logo-url");
  const themeColor = h.get("x-tenant-theme-color");

  const branding: TenantBranding | null = siteName
    ? { siteName, logoUrl, themeColor }
    : null;

  return {
    categoryId,
    categorySlug,
    branding,
    isHomeMarketplace: categoryId === null,
  };
}

/**
 * Resolve the visitor's nearest city for the nav "near you" item.
 *
 * Priority order (never renders a zero/below-threshold-provider city, never
 * a result outside the known-city list, never a non-ZA result):
 *   1. An explicit city the visitor previously selected (USER_CITY_COOKIE) —
 *      written either by picking a city directly, or by the client-side
 *      browser Geolocation API flow (components/GeoLocationResolver.tsx)
 *      posting coordinates to /api/geo-location, which snaps server-side and
 *      writes this same cookie before reloading. Browser geolocation can't
 *      resolve within a single server render (it needs a permission prompt
 *      and a client round-trip), so it is folded into this cookie rather
 *      than being a separate synchronous priority tier.
 *   2. Vercel's IP-geolocation coordinates (x-user-ip-lat/lng, ZA-only,
 *      forwarded every request by proxy.ts with no client round-trip
 *      needed), snapped to the nearest known-DB city.
 *   3. The configured default city, if it has live providers; otherwise null
 *      (caller renders the neutral "Near you" label).
 *
 * Snapping uses lib/domain/geo-location.ts (Haversine) against the live
 * DB-driven city list (getLocations) joined with config/city-coordinates.json
 * — never a hardcoded city list in component logic.
 */
export async function getUserLocation(): Promise<{ city: string; slug: string } | null> {
  const [h, c] = await Promise.all([headers(), cookies()]);

  const supabase = await createClient();
  const locations = await getLocations(supabase, 200);
  const knownCities = toKnownCities(locations);

  const ipLat = Number(h.get("x-user-ip-lat"));
  const ipLng = Number(h.get("x-user-ip-lng"));
  const ipCoordinates = Number.isFinite(ipLat) && Number.isFinite(ipLng) ? { lat: ipLat, lng: ipLng } : null;

  return resolveNavLocation({
    cookieCitySlug: c.get(USER_CITY_COOKIE)?.value ?? null,
    ipCountry: h.get("x-user-ip-country"),
    ipCoordinates,
    knownCities,
    minTileProviders: MIN_TILE_PROVIDERS,
    defaultCitySlug: DEFAULT_CITY.toLowerCase().replaceAll(" ", "-"),
  });
}
