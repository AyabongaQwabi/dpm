import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { RecommendedService } from '@/lib/recommended-services'
import type { DiscountType } from '@/lib/db'

function effectivePrice(price: number, discountType: DiscountType | null, discountAmount: number | null): number {
  if (!discountType || discountType === 'none' || discountAmount === null) return price
  if (discountType === 'amount') return price - discountAmount
  return price * (1 - discountAmount / 100)
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={[
            'h-3 w-3',
            i < full ? 'text-amber-400 fill-amber-400' : i === full && half ? 'text-amber-400 fill-amber-200' : 'text-muted-foreground/30 fill-muted-foreground/20',
          ].join(' ')}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

function ServiceCard({ service }: { service: RecommendedService }) {
  const price = service.defaultPrice
  const finalPrice = price !== null ? effectivePrice(price, service.defaultDiscountType, service.defaultDiscountAmount) : null
  const ctaLabel = service.serviceType === 'time_based' ? 'Book' : 'Order'
  const providerHref = service.providerSlug
    ? `/providers/${service.providerSlug}`
    : `/providers/${service.providerId}`

  return (
    <div className="group rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {service.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={service.image}
          alt={service.title}
          className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}
      <div className="flex flex-col flex-1 p-5">
        <p className="text-xs text-muted-foreground mb-1">{service.providerName}</p>
        <h3 className="font-semibold text-base leading-snug mb-1">{service.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{service.description}</p>

        {service.avgRating !== null && (
          <div className="flex items-center gap-1.5 mt-3">
            <RatingStars rating={service.avgRating} />
            <span className="text-xs text-muted-foreground">
              {service.avgRating.toFixed(1)} ({service.reviewCount} review{service.reviewCount !== 1 ? 's' : ''})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div>
            {finalPrice !== null ? (
              <>
                <span className="font-semibold">R {finalPrice.toFixed(2)}</span>
                {service.defaultDiscountType !== 'none' && service.defaultPrice !== null && (
                  <span className="ml-1.5 text-xs line-through text-muted-foreground">
                    R {service.defaultPrice.toFixed(2)}
                  </span>
                )}
                {service.defaultPackageName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{service.defaultPackageName}</p>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Price on request</span>
            )}
          </div>
          <Link
            href={`${providerHref}#services`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {ctaLabel}
            <Icon.arrowRight className="h-3.5 w-3.5" weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function RecommendedServices({ services }: { services: RecommendedService[] }) {
  if (services.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-accent">
            <Icon.sparkle className="h-4 w-4" weight="fill" />
            Recommended
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Services worth booking</h2>
          <p className="mt-2 text-muted-foreground">Ranked by verified reviews, booking volume, and provider reliability.</p>
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
        {services.map((svc) => (
          <ServiceCard key={svc.serviceId} service={svc} />
        ))}
      </div>
    </section>
  )
}
