// ARCH-003/005: tenant context resolution helpers.
// Server Components and route handlers call getTenantContext() to get the
// category filter and branding already resolved by the proxy. No re-query needed.
import { headers } from "next/headers";

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

// Resolve the visitor's nearest city from the geo header forwarded by the
// proxy. Returns the display name plus a URL slug for /providers/in/<slug>.
// Falls back to null so callers can show a neutral "Near you" label.
export async function getUserLocation(): Promise<{ city: string; slug: string } | null> {
  const h = await headers();
  const city = h.get("x-user-city");
  if (!city) return null;
  return {
    city,
    slug: city.toLowerCase().replaceAll(" ", "-"),
  };
}
