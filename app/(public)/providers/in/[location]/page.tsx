import type { Metadata } from 'next'
import Link from 'next/link'
import { ProviderCard } from '@/components/ProviderCard'
import { Pagination } from '@/components/Pagination'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getLocations, getPublishedProvidersPage, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd } from '@/lib/seo'

interface PageProps {
  params: Promise<{ location: string }>
  searchParams: Promise<{ page?: string }>
}

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createStaticClient()
  const locations = await getLocations(supabase, 200)
  return locations.map((location) => ({ location: location.slug }))
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const city = titleFromSlug(location)
  const title = `Providers in ${city}, South Africa`
  const description = `Find trusted providers in ${city}. Compare services, reviews, profiles, and recent provider posts on ServicePros.`
  const path = `/providers/in/${location}`
  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
    robots: page > 1 ? { index: false, follow: true } : undefined,
  }
}

export default async function ProvidersInLocationPage({ params, searchParams }: PageProps) {
  const { location } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const city = titleFromSlug(location)
  const supabase = await createClient()
  const [{ providers, total, totalPages }, categories] = await Promise.all([
    getPublishedProvidersPage(supabase, { city: location, page, pageSize: 24 }),
    getCategories(supabase),
  ])

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Providers', path: '/search' },
            { name: `Providers in ${city}`, path: `/providers/in/${location}` },
          ]),
          providerListJsonLd(
            `Providers in ${city}`,
            providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
          ),
        ]}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Local providers</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Providers in {city}</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Compare published provider profiles, services, reviews, and content from professionals serving {city}.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.slice(0, 8).map((category) => (
          <Link
            key={category.id}
            href={`/providers/category/${category.slug}/in/${location}`}
            className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
          >
            {category.name}
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <p className="mb-4 text-sm text-muted-foreground">{total} provider{total === 1 ? '' : 's'} found</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) => (p === 1 ? `/providers/in/${location}` : `/providers/in/${location}?page=${p}`)}
      />
    </main>
  )
}
