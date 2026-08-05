import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProviderCard } from '@/components/ProviderCard'
import { Pagination } from '@/components/Pagination'
import { JsonLd } from '@/components/seo/JsonLd'
import { getPublishedProvidersPage, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd } from '@/lib/seo'

interface PageProps {
  params: Promise<{ slug: string; location: string }>
  searchParams: Promise<{ page?: string }>
}

export const dynamicParams = true
export const revalidate = 3600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, location } = await params
  const category = titleFromSlug(slug)
  const city = titleFromSlug(location)
  const title = `${category} providers in ${city}, South Africa`
  const description = `Find and compare ${category.toLowerCase()} providers in ${city}. Browse profiles, services, and reviews on ServicePros.`
  const path = `/providers/category/${slug}/in/${location}`
  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
  }
}

export default async function ProvidersByCategoryInLocationPage({ params, searchParams }: PageProps) {
  const { slug, location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const city = titleFromSlug(location)
  const supabase = await createClient()

  const { providers, total, totalPages } = await getPublishedProvidersPage(supabase, {
    categorySlug: slug,
    city: location,
    page,
    pageSize: 24,
  })

  if (page === 1 && total === 0) notFound()

  const category = providers[0]?.categoryName ?? titleFromSlug(slug)

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={providerListJsonLd(
          `${category} providers in ${city}`,
          providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
        )}
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
