'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { ReportControl } from '@/components/providers/ReportControl'

export interface FeedStoryItem {
  id: string
  image_url: string | null
  body: string | null
  published_at: string | null
  provider: {
    id: string
    slug: string | null
    business_name: string
    profile_image: string | null
  }
}

export function FeedStoriesRail({ stories }: { stories: FeedStoryItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (stories.length === 0) return null

  const open = openIndex !== null ? stories[openIndex] : null
  const openBody = open?.body ? open.body.slice(0, 280) : ''

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Live stories</p>
          <h2 className="text-lg font-semibold text-foreground">Happening now</h2>
        </div>
        <span className="text-xs text-muted-foreground">Expires after 24h</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stories.map((story, index) => (
          <button
            key={story.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="w-24 shrink-0 text-left"
          >
            <span className="block rounded-full border-2 border-primary-accent p-1">
              <span className="block h-20 w-20 overflow-hidden rounded-full bg-muted">
                {story.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.image_url} alt="" className="h-full w-full object-cover" />
                ) : story.provider.profile_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.provider.profile_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Icon.sparkle className="h-5 w-5 text-primary-accent" weight="fill" />
                  </span>
                )}
              </span>
            </span>
            <span className="mt-2 block truncate text-xs font-semibold text-foreground">
              {story.provider.business_name}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="relative aspect-[9/16] max-h-[86vh] w-full max-w-sm overflow-hidden rounded-2xl bg-foreground text-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {open.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.image_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.image_url} alt="" className="absolute inset-0 h-full w-full object-contain px-4 pb-14 pt-16" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-accent to-foreground" />
            )}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-12 pt-4">
              <Link
                href={`/providers/${open.provider.slug ?? open.provider.id}`}
                className="min-w-0 truncate text-sm font-semibold text-white hover:underline"
              >
                {open.provider.business_name}
              </Link>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                className="rounded-full bg-black/35 p-1 text-white"
              >
                <Icon.close className="h-5 w-5" />
              </button>
            </div>
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
