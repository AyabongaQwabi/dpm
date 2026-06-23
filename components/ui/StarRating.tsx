import { Icon } from '@/components/ui/Icon'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md'
}

export function StarRating({ rating, reviewCount, size = 'md' }: StarRatingProps) {
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <p className={`inline-flex items-center gap-1 font-mono ${textClass} text-foreground`}>
      <Icon.star className={`${starClass} text-accent`} weight="fill" />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-muted-foreground">
          ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
        </span>
      )}
    </p>
  )
}
