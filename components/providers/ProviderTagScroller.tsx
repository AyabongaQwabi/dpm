'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ProviderTagScroller({ tags }: { tags: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  if (tags.length === 0) return null

  function scrollBy(direction: 'left' | 'right') {
    scrollerRef.current?.scrollBy({
      left: direction === 'left' ? -260 : 260,
      behavior: 'smooth',
    })
  }

  return (
    <div className="mt-4 flex max-w-3xl items-center gap-2">
      <button
        type="button"
        onClick={() => scrollBy('left')}
        aria-label="Scroll tags left"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:inline-flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scrollBy('right')}
        aria-label="Scroll tags right"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:inline-flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
