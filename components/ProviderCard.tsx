import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeList } from '@/components/ui/badge'
import { Icon } from '@/components/ui/Icon'
import { StarRating } from '@/components/ui/StarRating'
import { GoogleRatingBadge } from '@/components/ui/GoogleRatingBadge'
import {
  ProviderVerificationBadge,
  type BusinessType,
  type VerificationState,
} from '@/components/ui/VerifiedBadge'

export interface ProviderCardData {
  id: string
  business_name: string
  bio: string | null
  profile_image: string | null
  providerTypeName: string
  tags: string[]
  avgRating: number | null
  reviewCount?: number
  googleRating?: number | null
  googleRatingCount?: number
  isFeatured?: boolean
  slug?: string | null
  locationCity?: string | null
  businessType?: BusinessType
  verification?: VerificationState
}

// Status row: the single (latest) verification badge — or a grey "Unverified"
// tag — plus a real-data "Top rated" signal. No invented "open now" badges.
function StatusRow({ provider }: { provider: ProviderCardData }) {
  const topRated =
    provider.avgRating !== null && provider.avgRating >= 4.5 && (provider.reviewCount ?? 0) >= 3
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <ProviderVerificationBadge
        state={provider.verification ?? {}}
        businessType={provider.businessType}
      />
      {topRated && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <Icon.sparkle className="h-3.5 w-3.5" weight="fill" />
          Top rated
        </span>
      )}
    </div>
  )
}

// Alt text formula: "{Business name}, {provider type}{ in City}" — descriptive
// without keyword-stuffing. See docs/seo/SEO-IMAGE-ASSET-PLAN.md.
function providerImageAlt(provider: ProviderCardData): string {
  const context = [provider.providerTypeName, provider.locationCity ? `in ${provider.locationCity}` : null]
    .filter(Boolean)
    .join(' ')
  return context ? `${provider.business_name}, ${context}` : provider.business_name
}

// Full card — used on landing grid (portrait orientation, image top)
export function ProviderCard({ provider }: { provider: ProviderCardData }) {
  return (
    <Link
      href={`/providers/${provider.slug ?? provider.id}`}
      className="group block overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-muted">
        <Avatar
          src={provider.profile_image}
          alt={providerImageAlt(provider)}
          size="xl"
          shape="rounded"
          className="h-full w-full rounded-none transition-transform duration-500 group-hover:scale-105"
        />
        {provider.isFeatured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary-accent px-2.5 py-1 text-xs font-semibold text-primary-accent-foreground">
            <Icon.sparkle className="h-3.5 w-3.5" weight="fill" />
            Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="mb-1 font-mono text-xs uppercase tracking-wide text-primary-accent">{provider.providerTypeName}</p>
        <h3 className="font-display text-base font-semibold">{provider.business_name}</h3>
        {provider.locationCity && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Icon.pin className="h-3.5 w-3.5" />
            {provider.locationCity}
          </p>
        )}
        {(provider.avgRating !== null || provider.googleRating != null) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {provider.avgRating !== null && (
              <StarRating rating={provider.avgRating} reviewCount={provider.reviewCount} size="sm" />
            )}
            {provider.googleRating != null && (
              <GoogleRatingBadge rating={provider.googleRating} ratingCount={provider.googleRatingCount ?? 0} size="sm" />
            )}
          </div>
        )}
        <StatusRow provider={provider} />
        {provider.bio && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{provider.bio}</p>}
        {provider.tags.length > 0 && (
          <div className="mt-2">
            <BadgeList tags={provider.tags} />
          </div>
        )}
      </div>
    </Link>
  )
}

// Compact card — used on search results (horizontal orientation)
export function ProviderCardCompact({ provider }: { provider: ProviderCardData }) {
  return (
    <Link
      href={`/providers/${provider.slug ?? provider.id}`}
      className="flex gap-3 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Avatar src={provider.profile_image} alt={providerImageAlt(provider)} size="lg" shape="rounded" />
      <div className="min-w-0">
        <p className="mb-0.5 font-mono text-xs text-muted-foreground">{provider.providerTypeName}</p>
        <h3 className="truncate font-display text-sm font-semibold">{provider.business_name}</h3>
        {provider.locationCity && (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Icon.pin className="h-3.5 w-3.5" />
            {provider.locationCity}
          </p>
        )}
        {(provider.avgRating !== null || provider.googleRating != null) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {provider.avgRating !== null && (
              <StarRating rating={provider.avgRating} reviewCount={provider.reviewCount} size="sm" />
            )}
            {provider.googleRating != null && (
              <GoogleRatingBadge rating={provider.googleRating} ratingCount={provider.googleRatingCount ?? 0} size="sm" />
            )}
          </div>
        )}
        <StatusRow provider={provider} />
        {provider.bio && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{provider.bio}</p>}
        {provider.tags.length > 0 && (
          <div className="mt-1">
            <BadgeList tags={provider.tags} />
          </div>
        )}
      </div>
    </Link>
  )
}
