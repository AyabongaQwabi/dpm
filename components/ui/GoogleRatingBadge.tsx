import { Icon } from '@/components/ui/Icon'

interface GoogleRatingBadgeProps {
  rating: number
  ratingCount: number
  size?: 'sm' | 'md'
}

// Deliberately distinct from StarRating (platform booking reviews) so a
// Google-sourced rating is never mistaken for an on-platform review.
export function GoogleRatingBadge({ rating, ratingCount, size = 'md' }: GoogleRatingBadgeProps) {
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <p className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 font-mono ${textClass} text-foreground`}>
      <Icon.star className={`${starClass} text-accent`} weight="fill" />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({ratingCount} review{ratingCount !== 1 ? 's' : ''})
      </span>
      <span className="text-muted-foreground">on Google</span>
    </p>
  )
}
