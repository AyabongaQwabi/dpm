'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { ReportControl } from '@/components/providers/ReportControl'

// Ephemeral strip only — no permanent URL, no route, nothing indexed.
// Disappears entirely when nothing is live (caller passes an empty array
// and this component returns null). Rendered client-side since it's purely
// interactive (open/close a story), not a page a crawler should ever see
// server-rendered as its own resource.

interface StoryItem {
  id: string
  image_url: string | null
  body: string | null
  published_at: string | null
  expires_at?: string | null
}

export function StoriesStrip({ stories, businessName }: { stories: StoryItem[]; businessName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const railRef = useRef<HTMLDivElement>(null)

  if (stories.length === 0) return null

  const open = openIndex !== null ? stories[openIndex] : null
  const openBody = open?.body ? open.body.trim().slice(0, 280) : ''
  const storyCountLabel = `${stories.length} live ${stories.length === 1 ? 'story' : 'stories'}`

  function scrollStories(direction: 'left' | 'right') {
    const rail = railRef.current
    if (!rail) return

    rail.scrollBy({
      left: direction === 'left' ? -rail.clientWidth * 0.75 : rail.clientWidth * 0.75,
      behavior: 'smooth',
    })
  }

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-accent">Live stories</p>
            <h2 className="font-display text-xl font-semibold text-foreground">Latest from {businessName}</h2>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 text-primary-accent" />
              {storyCountLabel}
            </span>
            <button
              type="button"
              onClick={() => scrollStories('left')}
              aria-label="Scroll stories left"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary-accent/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollStories('right')}
              aria-label="Scroll stories right"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary-accent/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={railRef}
          className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
        >
          {stories.map((story, i) => (
            <button
              key={story.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative h-48 w-32 flex-shrink-0 snap-start overflow-hidden rounded-[var(--radius)] border border-border bg-card text-left shadow-sm transition-all duration-200 hover:border-primary-accent/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer sm:h-56 sm:w-40"
            >
              {story.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.image_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-md transition-transform duration-300 group-hover:scale-[1.15]" aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.image_url} alt={`${businessName} story`} className="absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]" />
                </>
              ) : (
                <span className="absolute inset-0 flex h-full w-full items-center justify-center bg-primary/10 craft-pattern">
                  <Icon.sparkle className="h-7 w-7 text-primary-accent" weight="fill" />
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-foreground/88 via-foreground/22 to-transparent" aria-hidden="true" />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-background/92 px-2 py-1 text-[11px] font-semibold text-primary shadow-sm">
                Story
              </span>
              <span className="absolute inset-x-0 bottom-0 p-3">
                <span className="block text-xs font-semibold uppercase tracking-wide text-primary-accent">
                  24h update
                </span>
                <span className="mt-1 block line-clamp-3 text-sm font-semibold leading-snug text-white">
                  {story.body?.trim() || `New update from ${businessName}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="relative aspect-[9/16] max-h-[86vh] w-full max-w-sm overflow-hidden rounded-2xl bg-foreground text-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {open.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.image_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.image_url} alt={`${businessName} story`} className="absolute inset-0 h-full w-full object-contain px-4 pb-14 pt-16" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-accent to-foreground" />
            )}
            <div className="absolute inset-x-4 top-3 z-20 flex gap-1">
              {stories.map((story) => (
                <span key={story.id} className="h-1 flex-1 rounded-full bg-white/35">
                  <span
                    className={`block h-full rounded-full bg-white ${story.id === open.id ? 'w-full' : 'w-0'}`}
                    aria-hidden="true"
                  />
                </span>
              ))}
            </div>
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-4 pb-10 pt-4">
              <div className="min-w-0 pt-4">
                <p className="truncate text-sm font-semibold text-white">{businessName}</p>
                <p className="text-xs text-white/75">Live story</p>
              </div>
              <button type="button" onClick={() => setOpenIndex(null)} aria-label="Close" className="rounded-full bg-black/35 p-1 text-white">
                <Icon.close className="h-5 w-5" />
              </button>
            </div>
            {stories.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setOpenIndex((index) => (index === null ? 0 : Math.max(0, index - 1)))}
                  aria-label="Previous story"
                  className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white sm:inline-flex cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpenIndex((index) => (index === null ? 0 : Math.min(stories.length - 1, index + 1)))}
                  aria-label="Next story"
                  className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white sm:inline-flex cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            {openBody && (
              <div className="absolute inset-x-0 bottom-12 z-10 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-16">
                <p className="line-clamp-6 whitespace-pre-line text-sm leading-6 text-white">{openBody}</p>
              </div>
            )}
            <div className="absolute bottom-3 left-4 z-10">
              <ReportControl postId={open.id} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
