'use client'

import { useState } from 'react'
import { submitReview } from '@/lib/actions/customer'

interface Props {
  bookingId: string
  serviceId: string
  packageId: string | null
}

export function ReviewForm({ bookingId, serviceId, packageId }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)

  return (
    <form action={submitReview} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      {packageId && <input type="hidden" name="packageId" value={packageId} />}
      <input type="hidden" name="rating" value={rating} />

      {/* Star picker */}
      <div>
        <p className="text-sm font-medium mb-2">Your rating</p>
        <div className="flex gap-1" role="group" aria-label="Rating">
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i + 1
            const filled = val <= (hovered || rating)
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(val)}
                onMouseEnter={() => setHovered(val)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${val} star${val > 1 ? 's' : ''}`}
                className="cursor-pointer transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <svg
                  className={`h-7 w-7 transition-colors ${filled ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30 fill-transparent'}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="review-comment" className="text-sm font-medium block mb-1.5">
          What did you think?
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={4}
          required
          placeholder="Share the details of your experience — what went well, what stood out…"
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={rating === 0}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Submit review
        </button>
        <p className="text-xs text-muted-foreground">
          {rating === 0 ? 'Select a star rating to continue.' : ''}
        </p>
      </div>
    </form>
  )
}
