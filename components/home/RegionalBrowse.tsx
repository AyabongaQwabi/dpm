import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

// Art-directed region illustrations keyed by location slug.
const REGION_ART: Record<string, string> = {
  'cape-town': '/images/regions/cape-town.png',
  johannesburg: '/images/regions/johannesburg.png',
  durban: '/images/regions/durban.png',
  pretoria: '/images/regions/pretoria.png',
  stellenbosch: '/images/regions/stellenbosch.png',
  sandton: '/images/regions/sandton.png',
}

interface RegionalBrowseProps {
  locations: Array<{ city: string; slug: string; count: number }>
}

export function RegionalBrowse({ locations }: RegionalBrowseProps) {
  if (!locations.length) return null

  // Lead with cities that have art direction, then fill with the rest.
  const sorted = [...locations].sort((a, b) => {
    const aArt = REGION_ART[a.slug] ? 1 : 0
    const bArt = REGION_ART[b.slug] ? 1 : 0
    if (aArt !== bArt) return bArt - aArt
    return b.count - a.count
  })

  const [feature, ...rest] = sorted

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Browse by region</h2>
        <p className="mt-2 text-muted-foreground">
          From the Mother City to the City of Gold — find providers rooted in the place you call home.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Feature tile spans two columns on desktop */}
        <RegionTile location={feature} featured className="md:col-span-2" />
        {rest[0] && <RegionTile location={rest[0]} />}
      </div>

      {rest.length > 1 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rest.slice(1).map((location) => (
            <RegionTile key={location.slug} location={location} />
          ))}
        </div>
      )}
    </section>
  )
}

function RegionTile({
  location,
  featured = false,
  className = '',
}: {
  location: { city: string; slug: string; count: number }
  featured?: boolean
  className?: string
}) {
  const art = REGION_ART[location.slug]

  return (
    <Link
      href={`/providers/in/${location.slug}`}
      className={`group relative flex overflow-hidden rounded-2xl border bg-primary text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-xl ${
        featured ? 'min-h-64' : 'min-h-44'
      } ${className}`}
    >
      {art ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art}
            alt={`${location.city} illustration`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,hsl(var(--primary)/0.85))]" />
        </>
      ) : (
        <div className="craft-pattern absolute inset-0 opacity-70" aria-hidden="true" />
      )}

      <div className="relative mt-auto flex w-full items-end justify-between gap-3 p-5">
        <div>
          <h3 className={`font-display font-bold ${featured ? 'text-2xl' : 'text-lg'}`}>{location.city}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary-foreground/80">
            <Icon.pin className="h-4 w-4" weight="fill" />
            <span className="font-mono">{location.count}</span>
            {location.count === 1 ? 'provider' : 'providers'}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 transition-colors group-hover:bg-primary-accent">
          <Icon.arrowRight className="h-4 w-4" weight="bold" />
        </span>
      </div>
    </Link>
  )
}
