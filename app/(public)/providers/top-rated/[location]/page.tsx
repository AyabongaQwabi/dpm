import type { Metadata } from 'next'
import { ProviderCard } from '@/components/ProviderCard'
import { Pagination } from '@/components/Pagination'
import { JsonLd } from '@/components/seo/JsonLd'
import { getPublishedProvidersPage, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd } from '@/lib/seo'

interface PageProps {
  params: Promise<{ location: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const city = titleFromSlug(location)
  const title = `Top-rated providers in ${city}, South Africa`
  const description = `Browse top-rated local providers in ${city} by reviews and service profile quality on ServicePros.`
  const path = `/providers/top-rated/${location}`
  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
    robots: page > 1 ? { index: false, follow: true } : undefined,
  }
}

export default async function TopRatedProvidersPage({ params, searchParams }: PageProps) {
  const { location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const city = titleFromSlug(location)
  const supabase = await createClient()
  const { providers, totalPages } = await getPublishedProvidersPage(supabase, {
    city: location,
    orderByRating: true,
    page,
    pageSize: 24,
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Providers', path: '/search' },
            { name: `Top-rated providers in ${city}`, path: `/providers/top-rated/${location}` },
          ]),
          providerListJsonLd(
            `Top-rated providers in ${city}`,
            providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
          ),
        ]}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Top rated</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Top-rated providers in {city}</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Ranked from available review data, with rich profiles for deeper comparison.
        </p>
      </section>
      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </section>
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) => (p === 1 ? `/providers/top-rated/${location}` : `/providers/top-rated/${location}?page=${p}`)}
      />
    </main>
  )
}
