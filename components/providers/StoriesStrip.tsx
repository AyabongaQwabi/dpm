'use client'

import { useState } from 'react'
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
}

export function StoriesStrip({ stories, businessName }: { stories: StoryItem[]; businessName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (stories.length === 0) return null

  const open = openIndex !== null ? stories[openIndex] : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {stories.map((story, i) => (
          <button
            key={story.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="flex-shrink-0 h-16 w-16 overflow-hidden rounded-full border-2 border-primary-accent p-0.5"
          >
            {story.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.image_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                <Icon.sparkle className="h-5 w-5 text-primary-accent" weight="fill" />
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{businessName}</p>
              <button type="button" onClick={() => setOpenIndex(null)} aria-label="Close" className="text-muted-foreground">
                <Icon.close className="h-5 w-5" />
              </button>
            </div>
            {open.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.image_url} alt="" className="mt-3 w-full rounded-lg object-cover" />
            )}
            {open.body && <p className="mt-3 whitespace-pre-line text-sm leading-6">{open.body}</p>}
            <div className="mt-4">
              <ReportControl postId={open.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
