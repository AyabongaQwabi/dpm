# SEO, prerendering, manifest, and sitemap

**Date:** 2026-07-02  
**Status:** Implemented

## Goal

Improve discoverability and crawlability of the ServicePros public marketplace with complete metadata, ISR for directory pages, dynamic sitemap/robots, JSON-LD structured data, PWA manifest, and security/image config in Next.js.

## Context

- Root layout had minimal metadata; many public pages lacked `generateMetadata`, canonical URLs, or structured data.
- No `sitemap.ts` or `robots.ts`.
- `site.webmanifest` was empty placeholders.
- Provider/location/category pages are server-rendered but had no ISR hints.

## Scope

- `app/layout.tsx`, public listing pages, `app/sitemap.ts`, `app/robots.ts`, `next.config.ts`, `public/site.webmanifest`, `lib/seo.ts`, `components/seo/JsonLd.tsx`, `public/images/og-default.png`

**Out of scope:** Dashboard/auth routes, Paystack webhooks, tenant subdomain theming changes.

## Implementation summary

1. Shared SEO helpers in `lib/seo.ts` (canonical, OG/Twitter defaults, JSON-LD builders).
2. Full root metadata with `metadataBase` `https://servicepros.co.za`, E-E-A-T publisher fields, OG/Twitter, icons, manifest link.
3. Per-page metadata + canonical on all public metadata exports; policy pages `robots: { index: false }`.
4. ISR: home/location/category `revalidate=3600`; provider profiles `revalidate=1800`; `generateStaticParams` for location/category only.
5. Dynamic sitemap from Supabase (providers, categories, locations) + static high-value routes.
6. `robots.ts` allows AI crawlers; disallows account/dashboard/api/checkout.
7. JSON-LD: `LocalBusiness` on provider profiles; `ItemList` on home, search, category, location pages.
8. `next.config.ts`: Supabase/Pexels/Unsplash `remotePatterns` + security headers.

## Acceptance

- [ ] `npm run build` succeeds
- [ ] `/sitemap.xml` lists providers, categories, locations
- [ ] `/robots.txt` references sitemap and allows GPTBot/PerplexityBot
- [ ] View source on home/search/category/provider shows canonical + JSON-LD
- [ ] `public/site.webmanifest` has ServicePros branding
- [ ] OG image resolves at `/images/og-default.png`
