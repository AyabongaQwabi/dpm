import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProviderCard } from '@/components/ProviderCard'
import { Pagination } from '@/components/Pagination'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getPublishedProvidersPage, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd, seoIndexPolicy, SEO_INDEX_THRESHOLDS } from '@/lib/seo'

interface PageProps {
  params: Promise<{ slug: string; location: string }>
  searchParams: Promise<{ page?: string }>
}

export const dynamicParams = true
export const revalidate = 3600

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const category = titleFromSlug(slug)
  const city = titleFromSlug(location)
  const title = `${category} providers in ${city}, South Africa`
  const description = `Find and compare ${category.toLowerCase()} providers in ${city}. Browse profiles, services, and reviews on ServicePros.`
  const path = `/providers/category/${slug}/in/${location}`

  let robots: Metadata['robots']
  if (page > 1) {
    robots = { index: false, follow: true }
  } else {
    const supabase = await createClient()
    const { total } = await getPublishedProvidersPage(supabase, { categorySlug: slug, city: location, page: 1, pageSize: 1 })
    robots = seoIndexPolicy(total, SEO_INDEX_THRESHOLDS.categoryLocationMinProviders)
  }

  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
    robots,
  }
}

export default async function ProvidersByCategoryInLocationPage({ params, searchParams }: PageProps) {
  const { slug, location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const city = titleFromSlug(location)
  const supabase = await createClient()

  const [{ providers, total, totalPages }, categories] = await Promise.all([
    getPublishedProvidersPage(supabase, {
      categorySlug: slug,
      city: location,
      page,
      pageSize: 24,
    }),
    getCategories(supabase),
  ])

  if (page === 1 && total === 0) notFound()

  const category = providers[0]?.categoryName ?? titleFromSlug(slug)
  const relatedCategories = categories.filter((c) => c.slug !== slug).slice(0, 5)

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Providers', path: '/search' },
            { name: `${category} providers`, path: `/providers/category/${slug}` },
            { name: `${category} providers in ${city}`, path: `/providers/category/${slug}/in/${location}` },
          ]),
          providerListJsonLd(
            `${category} providers in ${city}`,
            providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
          ),
        ]}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
          <Link href={`/providers/category/${slug}`} className="hover:underline">
            {category}
          </Link>
          {' · '}
          <Link href={`/providers/in/${location}`} className="hover:underline">
            {city}
          </Link>
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          {category} providers in {city}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Browse provider profiles, service offers, media, and reviews matching both filters.
        </p>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">{total} provider{total === 1 ? '' : 's'} found</p>
      <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </section>

      <section className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold tracking-tight">Related searches</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/providers/category/${slug}`} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
            All {category} providers
          </Link>
          <Link href={`/providers/in/${location}`} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
            All providers in {city}
          </Link>
          {relatedCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/providers/category/${c.slug}/in/${location}`}
              className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
            >
              {c.name} in {city}
            </Link>
          ))}
        </div>
      </section>

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) =>
          p === 1
            ? `/providers/category/${slug}/in/${location}`
            : `/providers/category/${slug}/in/${location}?page=${p}`
        }
      />
    </main>
  )
}
