import type { Metadata } from 'next'
import Link from 'next/link'
import { ServicesFilters } from '@/components/ServicesFilters'
import { ServiceListingCard } from '@/components/ServiceListingCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getServices, getLocations } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

interface Props {
  searchParams: Promise<{
    category?: string
    q?: string
    city?: string
    min?: string
    max?: string
  }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category, q, city, min, max } = await searchParams
  const hasFilters = Boolean(category || q || city || min || max)
  const title = 'Browse services from South African providers'
  const description =
    'Browse services offered by verified local providers across categories and cities. Compare pricing, reviews, and book on ServicePros.'

  return {
    title,
    description,
    alternates: canonicalAlternates('/services'),
    openGraph: defaultOpenGraph(
      title,
      'Browse services offered by verified local providers across categories and cities on ServicePros.',
      '/services',
    ),
    twitter: defaultTwitter(
      title,
      'Browse services offered by verified local providers across categories and cities on ServicePros.',
    ),
    robots: hasFilters ? { index: false, follow: true } : undefined,
  }
}

export default async function ServicesPage({ searchParams }: Props) {
  const { category, q, city, min, max } = await searchParams
  const supabase = await createClient()

  const minPrice = min ? Number(min) : undefined
  const maxPrice = max ? Number(max) : undefined

  const [services, categories, locations] = await Promise.all([
    getServices(supabase, 72, { categorySlug: category, search: q, city, minPrice, maxPrice }),
    getCategories(supabase),
    getLocations(supabase, 12),
  ])

  const activeFiltersCount = [category, q, city, min, max].filter(Boolean).length

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ])}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Services</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Browse bookable services</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Explore service offers from published providers, then open any service for full details, pricing packages, and booking.
        </p>
      </section>

      <ServicesFilters
        categories={categories}
        locations={locations}
        activeCategory={category}
        activeCity={city}
        activeSearch={q}
        activeMin={min}
        activeMax={max}
      />

      {services.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">
            No services found{activeFiltersCount > 0 ? ' matching your filters' : ''}.
          </p>
          {activeFiltersCount > 0 && (
            <Link href="/services" className="mt-3 inline-block text-sm text-primary hover:underline">
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            {services.length} service{services.length !== 1 ? 's' : ''} found
          </p>
          <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceListingCard key={service.id} service={service} />
            ))}
          </section>
        </>
      )}
    </main>
  )
}
