import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { JsonLd } from '@/components/seo/JsonLd'
import { getLocations } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { filterVisibleTiles } from '@/lib/domain/browse'
import { MIN_TILE_PROVIDERS } from '@/lib/browse-config'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Browse providers by city — South Africa',
  description: 'Every South African city with trusted ServicePros providers, from the biggest metros to the smaller towns.',
  alternates: canonicalAlternates('/browse/cities'),
  openGraph: defaultOpenGraph(
    'Browse providers by city — South Africa',
    'Every South African city with trusted ServicePros providers.',
    '/browse/cities',
  ),
  twitter: defaultTwitter(
    'Browse providers by city — South Africa',
    'Every South African city with trusted ServicePros providers.',
  ),
}

export default async function BrowseCitiesPage() {
  const supabase = await createClient()
  // The homepage only features the top 8 cities as tiles; this page is the
  // full long tail so every city with real inventory stays reachable and
  // indexable even though it never appears on the homepage grid.
  const locations = await getLocations(supabase, 500)
  const visibleLocations = filterVisibleTiles(
    locations.map((l) => ({ ...l, providerCount: l.count })),
    MIN_TILE_PROVIDERS,
  )
  const sorted = [...visibleLocations].sort((a, b) => b.count - a.count)

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Cities', path: '/browse/cities' },
          ]),
        ]}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Browse</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Providers by city</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Every South African city with trusted ServicePros providers, from the biggest metros to the smaller towns.
        </p>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((location) => (
          <Link
            key={location.slug}
            href={`/providers/in/${location.slug}`}
            className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <Icon.pin className="h-4 w-4 text-primary-accent" />
              {location.city}
            </span>
            <span className="font-mono text-sm text-muted-foreground">{location.count}</span>
          </Link>
        ))}
      </section>
    </main>
  )
}
