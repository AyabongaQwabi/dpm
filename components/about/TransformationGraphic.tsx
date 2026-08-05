'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The signature "dead listing becomes a live business" graphic.
 * Animates once on scroll into view; static side-by-side under
 * prefers-reduced-motion or before JS has a chance to observe.
 */
export function TransformationGraphic() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const node = ref.current
    if (!node || active) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A flat, dead directory listing on the left transforms into a live provider business on the right, with a profile, services, a verified badge, a quote and a payment, and a review."
      className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-4"
    >
      <DeadListing />

      <div className="flex justify-center py-2 sm:py-0">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="rotate-90 text-primary-accent sm:rotate-0">
          <path
            d="M6 20h24m0 0-8-8m8 8-8 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={active ? 'dpm-arrow-draw' : ''}
            pathLength={1}
          />
        </svg>
      </div>

      <LiveProvider active={active} />
    </div>
  )
}

function DeadListing() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-muted-foreground">
      <p className="text-xs font-semibold uppercase tracking-wide">A directory listing</p>
      <div className="mt-4 h-3 w-2/3 rounded bg-muted-foreground/25" />
      <div className="mt-2 h-3 w-1/3 rounded bg-muted-foreground/20" />
      <div className="mt-6 h-px w-full bg-border" />
      <p className="mt-4 text-sm">No profile. No services. No way to be paid.</p>
    </div>
  )
}

function LiveProvider({ active }: { active: boolean }) {
  return (
    <div
      className={[
        'rounded-2xl border bg-card p-6 shadow-sm transition-all duration-700',
        active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 sm:opacity-100 sm:translate-y-0',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
          NP
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-foreground">Ndlovu Plumbing</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-accent">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 1.5 12.4 6l5 .7-3.6 3.5.9 5-4.7-2.4-4.7 2.4.9-5L2.6 6.7l5-.7L10 1.5Z" />
            </svg>
            Verified
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {['Geyser repair', 'Leak detection', 'Emergency callout'].map((service) => (
          <span key={service} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {service}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        &ldquo;Quoted, arrived on time, sorted the leak in an hour.&rdquo;
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
        <span className="text-muted-foreground">Quote: R850</span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          Paid
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  )
}
