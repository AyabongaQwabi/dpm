import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { StarRating } from '@/components/ui/StarRating'
import type { DiscountType } from '@/lib/db'
import { formatCredits } from '@/lib/format-credits'

export interface ServiceCardData {
  id: string
  title: string
  description: string
  price: number
  discount_type: DiscountType
  discount_amount: number | null
  image: string | null
}

export interface ServiceProviderInfo {
  name: string
  slug: string | null
  profileImage: string | null
  avgRating: number | null
  reviewCount?: number
  locationCity?: string | null
}

function calcFinalPrice(price: number, discountType: DiscountType, discountAmount: number | null) {
  if (discountType === 'amount' && discountAmount !== null) return price - discountAmount
  if (discountType === 'percent' && discountAmount !== null) return price * (1 - discountAmount / 100)
  return price
}

interface ServiceCardProps {
  service: ServiceCardData
  /** Link target for the call-to-action. */
  bookHref?: string
  /** CTA label — "Get", "Hire", "Buy" all work better than "Book". */
  ctaLabel?: string
  /** Provider summary shown on the card (profile + rating). */
  provider?: ServiceProviderInfo
}

export function ServiceCard({ service, bookHref, ctaLabel = 'Get this service', provider }: ServiceCardProps) {
  const price = Number(service.price)
  const discountAmt = service.discount_amount ? Number(service.discount_amount) : null
  const finalPrice = calcFinalPrice(price, service.discount_type, discountAmt)
  const hasDiscount = service.discount_type !== 'none'

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      {service.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={service.image || "/placeholder.svg"} alt={service.title} className="h-36 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-4">
        {provider && (
          <Link
            href={provider.slug ? `/providers/${provider.slug}` : '#'}
            className="mb-3 flex items-center gap-2.5"
          >
            <Avatar src={provider.profileImage} alt={provider.name} size="sm" shape="circle" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{provider.name}</span>
              {provider.avgRating !== null ? (
                <StarRating rating={provider.avgRating} reviewCount={provider.reviewCount} size="sm" />
              ) : (
                provider.locationCity && (
                  <span className="text-xs text-muted-foreground">{provider.locationCity}</span>
                )
              )}
            </span>
          </Link>
        )}

        <h3 className="mb-1 font-semibold">{service.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
        <div className="mb-3 mt-auto flex items-center gap-2">
          <span className="font-bold">{formatCredits(finalPrice)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">{formatCredits(price)}</span>
          )}
          {service.discount_type === 'percent' && discountAmt !== null && (
            <span className="text-xs font-medium text-primary-accent">{discountAmt}% off</span>
          )}
        </div>
        {bookHref && (
          <Link
            href={bookHref}
            className="block rounded-lg bg-primary-accent py-2 text-center text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
