import type { Metadata } from 'next'
import Link from 'next/link'
import { ProviderCard } from '@/components/ProviderCard'
import { Pagination } from '@/components/Pagination'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getLocations, getPublishedProvidersPage, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd, seoIndexPolicy } from '@/lib/seo'
import { MIN_TILE_PROVIDERS } from '@/lib/browse-config'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createStaticClient()
  const categories = await getCategories(supabase)
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const category = titleFromSlug(slug)
  const title = `${category} providers in South Africa`
  const description = `Find and compare ${category.toLowerCase()} providers by services, reviews, location, and recent work on ServicePros.`
  const path = `/providers/category/${slug}`

  const supabase = await createClient()
  const { total } = await getPublishedProvidersPage(supabase, { categorySlug: slug, page: 1, pageSize: 1 })

  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    // images omitted — the colocated opengraph-image.tsx generates a
    // category-specific image (name + provider count) instead of the default.
    openGraph: defaultOpenGraph(title, description, path, null),
    twitter: defaultTwitter(title, description, null),
    robots: page > 1 ? { index: false, follow: true } : seoIndexPolicy(total, MIN_TILE_PROVIDERS),
  }
}

export default async function ProvidersByCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const supabase = await createClient()
  const [{ providers, total, totalPages }, locations] = await Promise.all([
    getPublishedProvidersPage(supabase, { categorySlug: slug, page, pageSize: 24 }),
    getLocations(supabase, 8),
  ])
  const category = providers[0]?.categoryName ?? titleFromSlug(slug)

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Providers', path: '/search' },
            { name: `${category} providers`, path: `/providers/category/${slug}` },
          ]),
          providerListJsonLd(
            `${category} providers`,
            providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
          ),
        ]}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Category</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{category} providers</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Browse provider profiles, service offers, media, and reviews in this category.
        </p>
      </section>
      <div className="mt-8 flex flex-wrap gap-2">
        {locations.map((location) => (
          <Link
            key={location.city}
            href={`/providers/category/${slug}/in/${location.slug}`}
            className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
          >
            {location.city}
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">{total} provider{total === 1 ? '' : 's'} found</p>
      <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </section>
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) => (p === 1 ? `/providers/category/${slug}` : `/providers/category/${slug}?page=${p}`)}
      />
    </main>
  )
}
