# Marketplace Public Iteration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first public-facing iteration of the provider marketplace: a polished home page, provider profile, SEO landing pages, content feed, services browser, seed data, schema migrations, and static auth/legal pages — all wired to Supabase with no dashboards yet.

**Architecture:** Next.js 16 App Router with server components for all data-fetching pages (SEO-first). Supabase JS client directly — no ORM. A CSS-variable theme system already exists in `globals.css` (light + dark via `.dark` class); we extend it to support per-tenant accent colors injected by `proxy.ts`. Pages live in `app/(public)/`; auth pages live in `app/(auth)/`. Legal/about pages are new static routes under `app/(public)/`.

**Tech Stack:** Next.js 16, Tailwind CSS v4, Supabase JS v2, Lucide React, Radix UI primitives, Vitest. Images sourced from Pexels API (`PEXELS_API_KEY`) or Unsplash (`UNSPLASH_ACCESS_KEY`). No new npm packages unless strictly necessary.

---

## Context: What Already Exists

| File | Status |
|------|--------|
| `app/(public)/page.tsx` | Basic grid of providers — needs full hero/sections redesign |
| `app/(public)/search/page.tsx` | Functional search + filter sidebar |
| `app/(public)/providers/[slug]/page.tsx` | Full profile page — needs tabs, visual polish |
| `app/(public)/feed/page.tsx` | Exists (unknown state — check before touching) |
| `app/(auth)/sign-up/page.tsx` | Functional form — needs visual polish |
| `app/(auth)/sign-in/page.tsx` | Exists (unknown state) |
| `components/ProviderCard.tsx` | Used on listing pages |
| `components/ServiceCard.tsx` | Used on profile page |
| `components/ui/` | badge, button, card, input, label, progress, select, textarea, Avatar, StarRating |
| `lib/supabase/{server,client,admin}.ts` | All present |
| `lib/session.ts` | `requireProviderSession()`, `requireCustomerSession()` |
| `lib/tenant.ts` | `getTenantContext()` |
| `lib/search.ts` | Signal-assembly → ranking |
| `lib/db.ts` | Hand-written type stubs |
| `supabase/migrations/20260620000000_init.sql` | Single baseline migration |
| `proxy.ts` | Tenant resolution middleware |

## Schema Gaps (need a second migration)

The baseline schema is missing:

| Missing | Needed for |
|---------|-----------|
| `providers.slug` (URL-friendly, unique) | SEO URLs like `/providers/ace-cleaners` |
| `providers.location_city`, `providers.location_state`, `providers.location_country` | Location-based SEO pages |
| `providers.is_featured` (boolean) | Featured providers section |
| `providers.is_seed` (boolean) | Identify + destroy seed data |
| `content_posts.post_type` (TEXT, e.g. 'social', 'tip', 'promo', 'update') | Content page filtering |
| `content_posts.is_seed` | Seed cleanup |
| `reviews.is_seed` | Seed cleanup |
| `provider_categories.description`, `provider_categories.icon` (TEXT) | Category discovery section |
| `provider_categories.is_seed` | Seed cleanup |
| `provider_types.is_seed` | Seed cleanup |
| `services.is_seed` | Seed cleanup |

## Site Map

```
/ (public)
├── /                          ← Home (hero, search, featured, categories, locations, reviews)
├── /search                    ← Paginated listing + filters (exists, polish)
├── /providers/[slug]          ← Provider profile (exists, redesign tabs)
├── /feed                      ← Content feed (exists or create)
├── /services                  ← Services browser (new)
├── /providers/in/[location]   ← SEO: providers in city/region (new)
├── /providers/category/[slug] ← SEO: providers by category (new)
├── /providers/service/[slug]  ← SEO: providers by service tag (new)
├── /providers/top-rated/[location] ← SEO: top-rated in location (new)
├── /about                     ← Static (new)
├── /terms                     ← Static (new)
├── /privacy                   ← Static (new)
│
(auth)
├── /sign-up                   ← Customer signup (exists, polish)
├── /sign-in                   ← Customer login (exists, polish)
├── /provider-signup           ← Provider signup (new — mirrors sign-up with role=provider forced)
└── /provider-login            ← Provider login (new — mirrors sign-in, redirects to dashboard)
```

## Theme System

- `globals.css` already has CSS variables for light/dark.
- Add `--primary-accent` CSS variable that can be overridden by tenant's `theme_color`.
- `app/layout.tsx` reads tenant theme color from a cookie/header and injects it as an inline style on `<html>`.
- A `ThemeToggle` client component toggles the `dark` class on `<html>` and saves preference to `localStorage`. It also respects `prefers-color-scheme` on first load.
- Provider subdomains: `proxy.ts` already forwards `x-tenant-theme-color`. The root layout uses this to set `--primary-accent`.

## Provider Profile Data Model

The profile page must handle varied provider types gracefully. Current flexible fields:

- `provider_field_values` — arbitrary key-value blob per provider (e.g. license numbers, specialties)
- `gallery` — JSONB array of image URLs
- `faqs` — JSONB array of `{question, answer}`
- `links` — JSONB array of `{label, url}`
- `services` — relational, with price and discount
- `reviews` — relational
- `content_posts` — relational, filterable by `post_type`

**Tabs:** Overview | Services | Gallery | Reviews | Posts | Contact

Each tab section renders only if data exists — no empty states that look broken.

## SEO Strategy

- `generateMetadata()` on every public page for title, description, og:image
- `<h1>` contains location/category keyword for SEO pages
- Internal links cross-link locations ↔ categories ↔ providers
- Location pages link to related categories; category pages link to cities where providers operate
- All pages server-rendered (no `'use client'` at the page level)

## Image Strategy

Use Pexels API for hero and stock images. Pattern:

```ts
// Pexels search URL (use fetch, not a library)
const res = await fetch(
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
  { headers: { Authorization: process.env.PEXELS_API_KEY! }, next: { revalidate: 86400 } }
)
```

Cache aggressively (`revalidate: 86400`). Fallback to a static gradient if fetch fails. Use `next/image` with appropriate `sizes` for all images served by the app.

## Seed Data Strategy

Seeds are identified by `is_seed = true` on providers, reviews, services, content_posts, categories, provider_types. The seed script runs SQL via Supabase admin client. The destroy script deletes WHERE `is_seed = true` in reverse FK order.

Categories seeded: Cleaning (10 providers), Events (10 providers), Legal (10 providers), Other (5 providers = 1 wellness, 1 fitness, 1 tutoring, 1 photography, 1 pet care).

---

## Implementation Phases

This plan covers **Phase 1: Public Pages + Seed Data**.

---

## Task 1: Schema Migration (missing columns)

**Files:**
- Create: `supabase/migrations/20260620000001_public_iteration.sql`
- Modify: `lib/db.ts` (add new fields to existing interfaces)

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260620000001_public_iteration.sql

-- Provider slug for SEO URLs
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'ZA',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS providers_slug_idx ON providers (slug);
CREATE INDEX IF NOT EXISTS providers_location_city_idx ON providers (location_city);
CREATE INDEX IF NOT EXISTS providers_is_featured_idx ON providers (is_featured);

-- Content post type for feed filtering
ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'social',
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed flags on related tables
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE provider_categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE provider_types ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
```

**Step 2: Apply the migration locally**

```bash
cd /Users/nonwork/dev/servicepros/dpm
supabase db push
```

Expected: migration applied without errors. If `supabase` CLI is not linked, run:
```bash
supabase link --project-ref <ref>
supabase db push
```

**Step 3: Update `lib/db.ts` interfaces**

Add new fields to `Provider`, `ContentPost`, `Review`, `Service`, `ProviderCategory`, `ProviderType`:

```ts
// In Provider interface:
slug: string | null
location_city: string | null
location_state: string | null
location_country: string | null
is_featured: boolean
is_seed: boolean

// In ContentPost interface:
post_type: string
is_seed: boolean

// In Review interface:
is_seed: boolean

// In Service interface:
is_seed: boolean

// In ProviderCategory interface:
description: string | null
icon: string | null
is_seed: boolean

// In ProviderType interface:
is_seed: boolean

// In Tag interface:
is_seed: boolean
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors (or only pre-existing errors, not new ones from your changes).

**Step 5: Commit**

```bash
git add supabase/migrations/20260620000001_public_iteration.sql lib/db.ts
git commit -m "feat: migration and types for public iteration (slug, location, is_featured, is_seed, post_type)"
```

---

## Task 2: Theme System (CSS variables + ThemeToggle)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/ThemeToggle.tsx`

**Step 1: Add `--primary-accent` variable to `globals.css`**

In the `:root` block, add:
```css
--primary-accent: 222.2 47.4% 11.2%;
--primary-accent-foreground: 210 40% 98%;
```

In the `.dark` block, add:
```css
--primary-accent: 210 40% 98%;
--primary-accent-foreground: 222.2 47.4% 11.2%;
```

In the `@theme inline` block, add:
```css
--color-primary-accent: hsl(var(--primary-accent));
--color-primary-accent-foreground: hsl(var(--primary-accent-foreground));
```

**Step 2: Create `components/ThemeToggle.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored ? stored === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="p-2 rounded-lg hover:bg-muted transition-colors"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
```

**Step 3: Update `app/layout.tsx`**

Read `x-tenant-theme-color` from request headers and inject as inline CSS variable. Also add a script tag for flash-of-unstyled-theme prevention:

```tsx
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'ServicePros', template: '%s | ServicePros' },
  description: 'Find trusted professionals for any job',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const themeColor = hdrs.get('x-tenant-theme-color')

  const accentStyle = themeColor
    ? ({ '--primary-accent': themeColor } as React.CSSProperties)
    : undefined

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Prevent FOUC on dark mode */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('theme');
            var d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (d) document.documentElement.classList.add('dark');
          })();
        ` }} />
      </head>
      <body className="min-h-full flex flex-col" style={accentStyle}>
        {children}
      </body>
    </html>
  )
}
```

**Step 4: Verify no type errors**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx components/ThemeToggle.tsx
git commit -m "feat: theme system with dark mode toggle and per-tenant accent color"
```

---

## Task 3: Shared Navigation Component

**Files:**
- Create: `components/SiteNav.tsx`
- Create: `components/SiteFooter.tsx`
- Modify: `app/(public)/layout.tsx` (create if doesn't exist)

**Step 1: Create `components/SiteNav.tsx`**

```tsx
import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

interface SiteNavProps {
  siteName?: string
  logoUrl?: string | null
}

export function SiteNav({ siteName = 'ServicePros', logoUrl }: SiteNavProps) {
  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
          ) : (
            <span>{siteName}</span>
          )}
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/search" className="hover:text-primary transition-colors">Find Providers</Link>
          <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
          <Link href="/feed" className="hover:text-primary transition-colors">Feed</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Join free
          </Link>
        </div>
      </div>
    </header>
  )
}
```

**Step 2: Create `components/SiteFooter.tsx`**

```tsx
import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t mt-auto py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-3">ServicePros</h3>
            <p className="text-sm text-muted-foreground">Find trusted professionals for any job.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Discover</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-foreground transition-colors">All Providers</Link></li>
              <li><Link href="/services" className="hover:text-foreground transition-colors">Services</Link></li>
              <li><Link href="/feed" className="hover:text-foreground transition-colors">Content Feed</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">For Providers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/provider-signup" className="hover:text-foreground transition-colors">Join as Provider</Link></li>
              <li><Link href="/provider-login" className="hover:text-foreground transition-colors">Provider Login</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} ServicePros. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

**Step 3: Create `app/(public)/layout.tsx`**

```tsx
import { getTenantContext } from '@/lib/tenant'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantContext()
  return (
    <>
      <SiteNav
        siteName={tenant.branding?.siteName ?? 'ServicePros'}
        logoUrl={tenant.branding?.logoUrl ?? null}
      />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  )
}
```

**Step 4: Check `lib/tenant.ts` to confirm the branding shape matches**

Read `lib/tenant.ts` and ensure `branding.logoUrl` (or equivalent) exists. If the field is named differently, update the nav accordingly.

**Step 5: Commit**

```bash
git add components/SiteNav.tsx components/SiteFooter.tsx app/(public)/layout.tsx
git commit -m "feat: shared nav and footer with theme toggle for public layout"
```

---

## Task 4: Home Page Redesign

**Files:**
- Modify: `app/(public)/page.tsx`
- Create: `components/home/HeroSection.tsx`
- Create: `components/home/FeaturedProviders.tsx`
- Create: `components/home/CategoryGrid.tsx`
- Create: `components/home/LocationSection.tsx`
- Create: `components/home/TrustSection.tsx`

**Step 1: Create `components/home/HeroSection.tsx`**

Fetches a hero image from Pexels (city/service workers query). Has a search box that submits to `/search`.

```tsx
interface HeroSectionProps {
  heading: string
  subheading: string
  heroImageUrl?: string
}

export function HeroSection({ heading, subheading, heroImageUrl }: HeroSectionProps) {
  return (
    <section className="relative min-h-[540px] flex items-center overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700">
      {heroImageUrl && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
        </div>
      )}
      <div className="relative max-w-7xl mx-auto px-4 py-20 text-white">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 max-w-2xl leading-tight">
          {heading}
        </h1>
        <p className="text-xl text-white/80 mb-10 max-w-xl">{subheading}</p>
        <form action="/search" method="GET" className="flex gap-3 max-w-xl">
          <input
            name="q"
            type="search"
            placeholder="Search for a service or provider…"
            className="flex-1 rounded-xl px-5 py-3.5 text-foreground bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  )
}
```

**Step 2: Create `components/home/FeaturedProviders.tsx`**

Accepts the featured providers list and renders them using `ProviderCard`.

```tsx
import Link from 'next/link'
import { ProviderCard } from '@/components/ProviderCard'

interface ProviderCardData {
  id: string
  business_name: string
  bio: string | null
  profile_image: string | null
  providerTypeName: string
  tags: string[]
  avgRating: number | null
  slug?: string | null
}

interface FeaturedProvidersProps {
  providers: ProviderCardData[]
}

export function FeaturedProviders({ providers }: FeaturedProvidersProps) {
  if (providers.length === 0) return null
  return (
    <section className="py-16 max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold">Featured Providers</h2>
          <p className="text-muted-foreground mt-1">Handpicked professionals in your area</p>
        </div>
        <Link href="/search" className="text-sm underline underline-offset-4 hover:text-primary">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
      </div>
    </section>
  )
}
```

**Step 3: Create `components/home/CategoryGrid.tsx`**

```tsx
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  providerCount: number
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null
  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-2">Browse by Category</h2>
        <p className="text-muted-foreground mb-8">From cleaning to legal, we have you covered</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/providers/category/${cat.slug}`}
              className="group p-6 rounded-2xl bg-background border hover:border-primary hover:shadow-md transition-all"
            >
              {cat.icon && <span className="text-3xl mb-3 block">{cat.icon}</span>}
              <h3 className="font-semibold group-hover:text-primary transition-colors">{cat.name}</h3>
              {cat.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">{cat.providerCount} providers</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 4: Create `components/home/LocationSection.tsx`**

```tsx
import Link from 'next/link'

interface LocationData {
  city: string
  providerCount: number
}

export function LocationSection({ locations }: { locations: LocationData[] }) {
  if (locations.length === 0) return null
  return (
    <section className="py-16 max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-bold mb-2">Find Providers Near You</h2>
      <p className="text-muted-foreground mb-8">Browse professionals by location</p>
      <div className="flex flex-wrap gap-3">
        {locations.map((loc) => (
          <Link
            key={loc.city}
            href={`/providers/in/${encodeURIComponent(loc.city.toLowerCase().replace(/\s+/g, '-'))}`}
            className="px-5 py-2.5 rounded-full border bg-background hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all text-sm font-medium"
          >
            {loc.city}
            <span className="ml-1.5 text-xs opacity-60">({loc.providerCount})</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

**Step 5: Create `components/home/TrustSection.tsx`**

```tsx
import { Star, Shield, Clock } from 'lucide-react'

const STATS = [
  { icon: Star, label: 'Verified reviews', value: '10,000+' },
  { icon: Shield, label: 'Trusted providers', value: '500+' },
  { icon: Clock, label: 'Same-day bookings', value: '24/7' },
]

export function TrustSection() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="w-8 h-8 opacity-80" />
              <p className="text-4xl font-bold">{value}</p>
              <p className="text-primary-foreground/70">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 6: Rewrite `app/(public)/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedProviders } from '@/components/home/FeaturedProviders'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { LocationSection } from '@/components/home/LocationSection'
import { TrustSection } from '@/components/home/TrustSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Trusted Professionals | ServicePros',
  description: 'Browse verified service providers, compare services, and book with confidence.',
}

async function fetchHeroImage(): Promise<string | undefined> {
  try {
    const res = await fetch(
      'https://api.pexels.com/v1/search?query=professional+service+team&per_page=1&orientation=landscape',
      {
        headers: { Authorization: process.env.PEXELS_API_KEY ?? '' },
        next: { revalidate: 86400 },
      },
    )
    if (!res.ok) return undefined
    const json = await res.json()
    return json.photos?.[0]?.src?.large2x
  } catch {
    return undefined
  }
}

export default async function LandingPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  const [heroImage, { data: featuredRows }, { data: categoryRows }, { data: locationRows }] =
    await Promise.all([
      fetchHeroImage(),
      supabase
        .from('providers')
        .select(`
          id, slug, business_name, bio, profile_image,
          provider_types!inner(name, category_id),
          provider_tags(tag:tags(name)),
          reviews(rating)
        `)
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('provider_categories')
        .select('id, name, slug, description, icon')
        .order('name'),
      supabase
        .from('providers')
        .select('location_city')
        .eq('is_published', true)
        .not('location_city', 'is', null),
    ])

  // Category provider counts
  const categoryIds = (categoryRows ?? []).map((c) => c.id)
  const countsByCategory: Record<string, number> = {}
  if (categoryIds.length > 0) {
    const { data: countRows } = await supabase
      .from('provider_types')
      .select('category_id, providers(id)')
      .in('category_id', categoryIds)
    ;(countRows ?? []).forEach((pt) => {
      const arr = Array.isArray(pt.providers) ? pt.providers : []
      countsByCategory[pt.category_id] = (countsByCategory[pt.category_id] ?? 0) + arr.length
    })
  }

  const featured = (featuredRows ?? []).map((p) => {
    const pt = Array.isArray(p.provider_types) ? p.provider_types[0] : p.provider_types
    const reviews = (p.reviews ?? []) as { rating: number }[]
    return {
      id: p.id,
      slug: p.slug,
      business_name: p.business_name,
      bio: p.bio,
      profile_image: p.profile_image,
      providerTypeName: pt?.name ?? '',
      tags: (p.provider_tags ?? [])
        .map((t: { tag: { name: string }[] | null }) =>
          Array.isArray(t.tag) ? t.tag[0]?.name : (t.tag as { name: string } | null)?.name)
        .filter((n): n is string => !!n),
      avgRating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
    }
  })

  const categories = (categoryRows ?? []).map((c) => ({
    ...c,
    providerCount: countsByCategory[c.id] ?? 0,
  }))

  // Aggregate location counts
  const locationMap: Record<string, number> = {}
  for (const row of locationRows ?? []) {
    if (row.location_city) locationMap[row.location_city] = (locationMap[row.location_city] ?? 0) + 1
  }
  const locations = Object.entries(locationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([city, providerCount]) => ({ city, providerCount }))

  const siteName = tenant.branding?.siteName ?? 'ServicePros'
  const heading = tenant.isHomeMarketplace
    ? 'Find the right professional for any job'
    : `Find trusted ${siteName} professionals`

  return (
    <>
      <HeroSection
        heading={heading}
        subheading="Browse verified providers, compare services, and book with confidence."
        heroImageUrl={heroImage}
      />
      <FeaturedProviders providers={featured} />
      <CategoryGrid categories={categories} />
      <TrustSection />
      <LocationSection locations={locations} />
    </>
  )
}
```

**Step 7: Verify page renders**

```bash
npm run dev
# Open http://localhost:3000 and check hero, featured section, categories, locations
```

**Step 8: Commit**

```bash
git add app/(public)/page.tsx components/home/
git commit -m "feat: home page redesign with hero, featured providers, categories, and location discovery"
```

---

## Task 5: Provider Profile Page — Tabs and Visual Polish

**Files:**
- Create: `components/profile/ProfileTabs.tsx`
- Modify: `app/(public)/providers/[slug]/page.tsx`

**Step 1: Create `components/profile/ProfileTabs.tsx`**

Client component that manages active tab state:

```tsx
'use client'

import { useState } from 'react'

export type TabKey = 'overview' | 'services' | 'gallery' | 'reviews' | 'posts' | 'contact'

interface Tab {
  key: TabKey
  label: string
  count?: number
}

interface ProfileTabsProps {
  tabs: Tab[]
  children: (active: TabKey) => React.ReactNode
}

export function ProfileTabs({ tabs, children }: ProfileTabsProps) {
  const [active, setActive] = useState<TabKey>(tabs[0]?.key ?? 'overview')
  return (
    <div>
      <div className="border-b flex gap-1 mb-8 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  )
}
```

**Step 2: Update the provider profile page**

The route `[slug]` now resolves against `providers.slug` first, falling back to `providers.id` for backward compat. Add tabs, a cover section, and better visual hierarchy. The full rewrite of `app/(public)/providers/[slug]/page.tsx` should:

- Query by `slug` OR `id` using `.or('slug.eq.' + slug + ',id.eq.' + slug)`
- Render a full-width cover/header area with profile image, name, type badge, rating, location
- Use `ProfileTabs` to organize: Overview (bio, FAQs, links), Services, Gallery, Reviews, Posts, Contact (links + CTA)
- Show `generateMetadata` using slug

Key query change:
```ts
.or(`slug.eq.${slug},id.eq.${slug}`)
```

**Step 3: Commit**

```bash
git add components/profile/ app/(public)/providers/
git commit -m "feat: provider profile tabs and visual redesign"
```

---

## Task 6: SEO Landing Pages

### 6a: Providers in Location (`/providers/in/[location]`)

**Files:**
- Create: `app/(public)/providers/in/[location]/page.tsx`

```tsx
// Fetches providers WHERE location_city ILIKE location (URL-decoded, slug → display name)
// generateMetadata: title = "Service Providers in {City} | ServicePros"
// Page: h1, provider grid, category filter chips, internal links to other cities
```

Data fetching pattern:
```ts
const city = decodeURIComponent(location).replace(/-/g, ' ')
const { data } = await supabase
  .from('providers')
  .select('id, slug, business_name, bio, profile_image, ...')
  .eq('is_published', true)
  .ilike('location_city', city)
  .order('is_featured', { ascending: false })
  .order('created_at', { ascending: false })
```

### 6b: Providers by Category (`/providers/category/[slug]`)

**Files:**
- Create: `app/(public)/providers/category/[slug]/page.tsx`

Resolves category by `provider_categories.slug`, then joins providers through `provider_types`. Title: "Best {Category} Providers | ServicePros".

### 6c: Providers by Service Tag (`/providers/service/[slug]`)

**Files:**
- Create: `app/(public)/providers/service/[slug]/page.tsx`

Resolves tag by slug (tag name normalized to slug format), fetches providers via `provider_tags`. Title: "{Service} Professionals | ServicePros".

### 6d: Top-Rated in Location (`/providers/top-rated/[location]`)

**Files:**
- Create: `app/(public)/providers/top-rated/[location]/page.tsx`

Same as location page but join reviews, compute avg rating, filter `rating >= 4`, sort by avg rating DESC.

**Step: Commit all SEO pages together**

```bash
git add app/(public)/providers/in/ app/(public)/providers/category/ app/(public)/providers/service/ app/(public)/providers/top-rated/
git commit -m "feat: SEO landing pages — by location, category, service, and top-rated"
```

---

## Task 7: Feed Page (Content Posts)

**Files:**
- Modify or create: `app/(public)/feed/page.tsx`

Read the existing file first. If it already has content, review and polish it. If it's a stub, implement:

```tsx
// Server component
// Fetch content_posts joined with provider (name, profile_image, slug)
// Support ?type=social|tip|promo|update filter via searchParams
// Display as masonry-style or card grid
// generateMetadata: "Provider Feed | ServicePros"
```

Query:
```ts
let q = supabase
  .from('content_posts')
  .select('id, image_url, body, post_type, created_at, provider:providers(id, slug, business_name, profile_image)')
  .order('created_at', { ascending: false })
  .limit(48)

if (postType) q = q.eq('post_type', postType)
```

**Commit:**
```bash
git add app/(public)/feed/page.tsx
git commit -m "feat: content feed page with post_type filtering"
```

---

## Task 8: Services Page

**Files:**
- Create: `app/(public)/services/page.tsx`

```tsx
// Server component
// List all distinct service titles/tags grouped by category
// Each service links to its provider
// Search/filter via searchParams ?q=
// generateMetadata: "Browse Services | ServicePros"
```

Query:
```ts
const { data } = await supabase
  .from('services')
  .select('id, title, description, price, provider:providers(id, slug, business_name, profile_image, is_published, provider_types!inner(name, category_id, category:provider_categories(name, slug)))')
  .eq('providers.is_published', true)
  .order('title')
```

Group results by category client-side (or use a subquery via Supabase views if available).

**Commit:**
```bash
git add app/(public)/services/page.tsx
git commit -m "feat: services browse page grouped by category"
```

---

## Task 9: Static Pages (About, Terms, Privacy)

**Files:**
- Create: `app/(public)/about/page.tsx`
- Create: `app/(public)/terms/page.tsx`
- Create: `app/(public)/privacy/page.tsx`

Each is a server component returning a `<main>` with well-structured prose content. Use `generateMetadata` on each. Content should be real placeholder copy appropriate to a professional services marketplace.

**Commit:**
```bash
git add app/(public)/about/ app/(public)/terms/ app/(public)/privacy/
git commit -m "feat: static about, terms, and privacy pages"
```

---

## Task 10: Auth Pages Polish

**Files:**
- Modify: `app/(auth)/sign-up/page.tsx`
- Modify: `app/(auth)/sign-in/page.tsx`
- Create: `app/(auth)/provider-signup/page.tsx`
- Create: `app/(auth)/provider-login/page.tsx`
- Create: `app/(auth)/layout.tsx` (if doesn't exist)

**Step 1: Create `app/(auth)/layout.tsx`**

Center layout with brand mark, no nav:

```tsx
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <Link href="/" className="font-bold text-lg">ServicePros</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Polish sign-up/sign-in**

Both existing pages need:
- Visual card container (`max-w-sm`, rounded, shadow, border)
- Social proof line ("Join 500+ providers already on ServicePros")
- Better error styling
- `ThemeToggle` in the auth header

**Step 3: Create provider-specific auth pages**

`/provider-signup` — same as sign-up but `role=provider` is pre-selected and hidden (use a hidden input). Add a headline focused on providers: "List your business. Get more clients."

`/provider-login` — same as sign-in but with provider-focused copy and redirect to `/provider-dashboard`.

**Commit:**
```bash
git add app/(auth)/
git commit -m "feat: auth pages polish and provider-specific signup/login pages"
```

---

## Task 11: Seed Script

**Files:**
- Create: `scripts/seed.ts`

**Step 1: Write `scripts/seed.ts`**

The script uses the Supabase admin client (service-role key) to insert seed data. Run with:
```bash
npx tsx scripts/seed.ts
```

Structure:

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 1. Insert categories (cleaning, events, legal, other)
//    with icon emoji and description, is_seed=true

// 2. Insert provider_types per category (e.g. "Residential Cleaning", "Corporate Events"), is_seed=true

// 3. Insert 35 providers across types with:
//    - business_name, bio, slug (slugified business_name), profile_image (Pexels URL)
//    - location_city (mix of Johannesburg, Cape Town, Durban, Pretoria)
//    - is_published=true, is_seed=true
//    - 6 is_featured=true (2 per major category)
//    - gallery (3-5 Pexels image URLs)
//    - faqs (2-3 Q&A)
//    - links (website, social)

// 4. Insert services (2-4 per provider), is_seed=true

// 5. Insert reviews (3-8 per provider) using dummy customer records, is_seed=true

// 6. Insert content_posts (2-5 per provider), post_type varies, is_seed=true

// 7. Insert tags and provider_tags

// Helper: slugify(name) → lowercase, replace spaces with hyphens, remove special chars
```

Use realistic South African business names and locations (Johannesburg, Cape Town, Durban, Pretoria, Sandton).

For images, use static Pexels URLs (search for relevant terms) or hardcode a list of known-good URLs to avoid API calls in the seed script.

**Step 2: Add `tsx` to devDependencies if needed**

```bash
npm install -D tsx
```

**Step 3: Test the seed script**

```bash
npx tsx scripts/seed.ts
```

Expected: "Seeded N providers, N services, N reviews, N posts" output.

**Step 4: Verify data in Supabase dashboard or locally**

```bash
# Check providers were created
supabase db query "SELECT COUNT(*) FROM providers WHERE is_seed = true;"
```

Expected: 35

**Step 5: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat: seed script with 35 providers across cleaning, events, legal, and other categories"
```

---

## Task 12: Seed Destroy Script

**Files:**
- Create: `scripts/seed-destroy.ts`

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // Delete in reverse FK order to avoid constraint violations:
  // 1. content_posts WHERE is_seed = true
  // 2. reviews WHERE is_seed = true
  // 3. services WHERE is_seed = true
  // 4. provider_tags for seed providers
  // 5. provider_field_values for seed providers
  // 6. booking_status_history for bookings involving seed providers (if any)
  // 7. bookings for seed providers (if any)
  // 8. paid_placements for seed providers
  // 9. providers WHERE is_seed = true
  // 10. provider_types WHERE is_seed = true
  // 11. provider_categories WHERE is_seed = true
  // 12. tags WHERE is_seed = true
  // 13. customers created for seed reviews (if is_seed on customers added later)
  console.log('Seed data destroyed.')
}

main()
```

Run with: `npx tsx scripts/seed-destroy.ts`

**Commit:**
```bash
git add scripts/seed-destroy.ts
git commit -m "feat: seed destroy script for resetting seed data"
```

---

## Task 13: Update ProviderCard to Use Slug

**Files:**
- Modify: `components/ProviderCard.tsx`

The card currently links to `/providers/${p.id}`. Update to prefer slug:

```tsx
const href = `/providers/${p.slug ?? p.id}`
```

This is backward compatible — providers without a slug (pre-seed) still resolve via ID.

**Commit:**
```bash
git add components/ProviderCard.tsx
git commit -m "fix: ProviderCard links use slug with ID fallback"
```

---

## Task 14: Verify and Fix Type Errors + Linting

**Step 1:**
```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors introduced by new files.

**Step 2:**
```bash
npm run lint 2>&1 | head -50
```

Fix any lint errors (usually unused imports, `any` types, missing alt text).

**Step 3:**
```bash
npm run build 2>&1 | tail -30
```

Fix any build errors (missing `generateStaticParams`, unresolved imports, etc.).

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: type errors and lint issues from public iteration"
```

---

## Task 15: Smoke Test in Browser

**Step 1: Start the dev server**
```bash
npm run dev
```

**Step 2: Check each route manually**

| Route | Expected |
|-------|----------|
| `http://localhost:3000/` | Hero image, featured providers, categories, locations |
| `http://localhost:3000/search` | Provider listing with sidebar filters |
| `http://localhost:3000/providers/[slug-of-seeded-provider]` | Tabs, profile image, services, reviews |
| `http://localhost:3000/feed` | Grid of content posts, type filter |
| `http://localhost:3000/services` | Services grouped by category |
| `http://localhost:3000/providers/in/johannesburg` | Johannesburg providers |
| `http://localhost:3000/providers/category/cleaning` | Cleaning providers |
| `http://localhost:3000/providers/top-rated/cape-town` | Top-rated in Cape Town |
| `http://localhost:3000/about` | About page prose |
| `http://localhost:3000/sign-up` | Sign up form, styled |
| `http://localhost:3000/sign-in` | Sign in form, styled |
| `http://localhost:3000/provider-signup` | Provider-focused signup |

**Step 3: Test dark mode**

Click the moon icon in the nav — page should switch to dark. Refresh — should remain dark.

**Step 4: Final commit if any tweaks**

```bash
git add -A
git commit -m "fix: smoke test fixes and UI polish"
```

---

## Known Limitations and Next Steps

- **No pagination yet** on listing pages — just `.limit(50)`. Add cursor-based pagination in the next iteration.
- **No real booking flow** — the "Book" CTA on ServiceCard links to sign-in, which is correct for now.
- **Supabase images** — `profile_image` and `gallery` are plain URLs. A future iteration should use Supabase Storage buckets.
- **Provider subdomain theming** — `proxy.ts` already forwards `x-tenant-theme-color`. The CSS variable injection in `layout.tsx` wires it up, but testing requires a local custom domain setup (add `cleaning.localhost` to `/etc/hosts`).
- **`lib/db.ts` still hand-written** — run `supabase gen types typescript --linked > lib/db.ts` once the project is linked to Supabase to get fully accurate types.
- **Customer dashboards** — completely deferred. The `requireCustomerSession()` guard exists in `lib/session.ts` and the `app/customer-account/` directory is in place.
- **Provider dashboards** — `app/provider-dashboard/` exists with onboarding, bookings, and services pages. These are separate from this plan.

---

## Seed and Destroy Usage

```bash
# Seed the database (idempotent if slugs don't conflict)
npx tsx scripts/seed.ts

# Remove all seed data
npx tsx scripts/seed-destroy.ts

# Re-seed from scratch
npx tsx scripts/seed-destroy.ts && npx tsx scripts/seed.ts
```
