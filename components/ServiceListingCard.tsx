import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { StarRating } from '@/components/ui/StarRating'
import type { ServiceView } from '@/lib/public-data'

function effectivePrice(price: number, type: string, amount: number | null): number {
  if (type === 'amount' && amount !== null) return price - amount
  if (type === 'percent' && amount !== null) return price * (1 - amount / 100)
  return price
}

export function ServiceListingCard({ service }: { service: ServiceView }) {
  const packages = service.packages ?? []
  const defaultPkg = packages.find((p) => p.is_default) ?? packages[0]

  // Lowest effective price across all packages
  const lowestPrice = packages.length
    ? Math.min(...packages.map((p) => effectivePrice(p.price, p.discount_type, p.discount_amount)))
    : service.price

  const hasDiscount = defaultPkg
    ? defaultPkg.discount_type !== 'none' && defaultPkg.discount_amount !== null
    : false

  return (
    <Link
      href={`/services/${service.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary-accent/40 transition-all duration-200"
    >
      {/* Cover image */}
      {service.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={service.image}
          alt={service.title}
          className="h-44 w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
      ) : (
        <div className="h-36 w-full bg-muted/50 flex items-center justify-center">
          <svg className="h-10 w-10 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Provider */}
        <div className="mb-3 flex items-center gap-2.5">
          <Avatar src={service.providerProfileImage} alt={service.providerName} size="sm" shape="circle" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{service.providerName}</span>
            {service.providerAvgRating !== null ? (
              <StarRating rating={service.providerAvgRating} reviewCount={service.providerReviewCount} size="sm" />
            ) : service.locationCity ? (
              <span className="text-xs text-muted-foreground">{service.locationCity}</span>
            ) : null}
          </span>
        </div>

        {/* Title + description */}
        <h3 className="font-semibold text-foreground leading-snug">{service.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground leading-relaxed flex-1">
          {service.description}
        </p>

        {/* Package tier pills */}
        {packages.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {packages.map((pkg) => (
              <span
                key={pkg.id}
                className={[
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  pkg.is_default
                    ? 'border-primary-accent/40 bg-primary-accent/10 text-primary-accent'
                    : 'border-border text-muted-foreground',
                ].join(' ')}
              >
                {pkg.name}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">
                from R&nbsp;{lowestPrice.toFixed(2)}
              </span>
              {hasDiscount && defaultPkg && (
                <span className="text-sm text-muted-foreground line-through">
                  R&nbsp;{defaultPkg.price.toFixed(2)}
                </span>
              )}
            </div>
            {packages.length > 1 && (
              <p className="text-xs text-muted-foreground mt-0.5">{packages.length} packages</p>
            )}
          </div>
          <span className="inline-flex items-center rounded-xl bg-primary-accent px-4 py-2 text-sm font-semibold text-primary-accent-foreground group-hover:opacity-90 transition-opacity flex-shrink-0">
            View
          </span>
        </div>
      </div>
    </Link>
  )
}
