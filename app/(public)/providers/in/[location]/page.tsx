import type { Metadata } from 'next'
import Link from 'next/link'
import { ProviderCard } from '@/components/ProviderCard'
import { getCategories, getPublishedProviders, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ location: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { location } = await params
  const city = titleFromSlug(location)
  return {
    title: `Providers in ${city}`,
    description: `Find trusted providers in ${city}. Compare services, reviews, profiles, and recent provider posts.`,
  }
}

export default async function ProvidersInLocationPage({ params }: PageProps) {
  const { location } = await params
  const city = titleFromSlug(location)
  const supabase = await createClient()
  const [providers, categories] = await Promise.all([
    getPublishedProviders(supabase, { city: location, limit: 48 }),
    getCategories(supabase),
  ])

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Local providers</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Providers in {city}</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Compare published provider profiles, services, reviews, and content from professionals serving {city}.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.slice(0, 8).map((category) => (
          <Link key={category.id} href={`/providers/category/${category.slug}`} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
            {category.name}
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <p className="mb-4 text-sm text-muted-foreground">{providers.length} providers found</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>
    </main>
  )
}
