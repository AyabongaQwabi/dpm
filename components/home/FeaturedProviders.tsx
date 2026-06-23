import Link from 'next/link'
import { ProviderCard } from '@/components/ProviderCard'
import { Icon } from '@/components/ui/Icon'
import type { ProviderCardView } from '@/lib/public-data'

export function FeaturedProviders({ providers }: { providers: ProviderCardView[] }) {
  if (!providers.length) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-accent">
            <Icon.sparkle className="h-4 w-4" weight="fill" />
            Featured
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Businesses worth a closer look</h2>
          <p className="mt-2 text-muted-foreground">A handpicked starting point across the country’s most-booked services.</p>
        </div>
        <Link
          href="/search"
          className="hidden items-center gap-1.5 text-sm font-medium text-primary-accent underline-offset-4 hover:underline sm:inline-flex"
        >
          View all
          <Icon.arrowRight className="h-4 w-4" weight="bold" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </section>
  )
}
