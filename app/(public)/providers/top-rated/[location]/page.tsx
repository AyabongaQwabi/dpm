import type { Metadata } from 'next'
import { ProviderCard } from '@/components/ProviderCard'
import { getPublishedProviders, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ location: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { location } = await params
  const city = titleFromSlug(location)
  return {
    title: `Top-rated Providers in ${city}`,
    description: `Browse top-rated local providers in ${city} by reviews and service profile quality.`,
  }
}

export default async function TopRatedProvidersPage({ params }: PageProps) {
  const { location } = await params
  const city = titleFromSlug(location)
  const supabase = await createClient()
  const providers = await getPublishedProviders(supabase, { city: location, orderByRating: true, limit: 48 })

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
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
    </main>
  )
}
