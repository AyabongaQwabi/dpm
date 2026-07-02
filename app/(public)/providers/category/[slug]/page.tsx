import type { Metadata } from 'next'
import Link from 'next/link'
import { ProviderCard } from '@/components/ProviderCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getLocations, getPublishedProviders, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd } from '@/lib/seo'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createStaticClient()
  const categories = await getCategories(supabase)
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = titleFromSlug(slug)
  const title = `${category} providers in South Africa`
  const description = `Find and compare ${category.toLowerCase()} providers by services, reviews, location, and recent work on ServicePros.`
  const path = `/providers/category/${slug}`
  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
  }
}

export default async function ProvidersByCategoryPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const [providers, locations] = await Promise.all([
    getPublishedProviders(supabase, { categorySlug: slug, limit: 48 }),
    getLocations(supabase, 8),
  ])
  const category = providers[0]?.categoryName ?? titleFromSlug(slug)

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={providerListJsonLd(
          `${category} providers`,
          providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
        )}
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
          <Link key={location.city} href={`/providers/in/${location.slug}`} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
            {location.city}
          </Link>
        ))}
      </div>
      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </section>
    </main>
  )
}
