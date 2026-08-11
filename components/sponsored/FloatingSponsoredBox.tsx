'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { SponsoredLabel } from '@/components/ui/SponsoredLabel'
import { StarRating } from '@/components/ui/StarRating'
import type { ProviderCardView } from '@/lib/public-data'

const STORAGE_KEY = 'servicepros-floating-sponsored-dismissed-until'

export function FloatingSponsoredBox({
  provider,
  dismissalHours,
}: {
  provider: ProviderCardView
  dismissalHours: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const dismissedUntil = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0)
      setVisible(!Number.isFinite(dismissedUntil) || Date.now() > dismissedUntil)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  const href = `/providers/${provider.slug ?? provider.id}`
  const dismiss = () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      String(Date.now() + Math.max(1, dismissalHours) * 60 * 60 * 1000),
    )
    setVisible(false)
  }

  return (
    <aside
      aria-label="Sponsored provider"
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[360px]"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-3 border-b bg-muted/50 px-4 py-3">
          <SponsoredLabel />
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="Dismiss sponsored provider"
          >
            <Icon.close className="h-4 w-4" />
          </button>
        </div>
        <Link href={href} className="block p-4 transition-colors hover:bg-muted/35">
          <div className="flex gap-3">
            <Avatar
              src={provider.profile_image}
              alt={provider.business_name}
              size="lg"
              shape="rounded"
              className="h-16 w-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold leading-tight text-foreground">
                {provider.business_name}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary-accent">
                {provider.providerTypeName}
              </p>
              {provider.locationCity && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon.pin className="h-3.5 w-3.5" />
                  {provider.locationCity}
                </p>
              )}
              {provider.avgRating !== null && (
                <div className="mt-2">
                  <StarRating rating={provider.avgRating} reviewCount={provider.reviewCount} size="sm" />
                </div>
              )}
            </div>
          </div>
          {provider.bio && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{provider.bio}</p>
          )}
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            View profile
            <Icon.arrowRight className="h-4 w-4" weight="bold" />
          </span>
        </Link>
      </div>
    </aside>
  )
}
