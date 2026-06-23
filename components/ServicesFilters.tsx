'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { CategoryView } from '@/lib/public-data'

interface Location {
  city: string
  slug: string
  count: number
}

interface Props {
  categories: CategoryView[]
  locations: Location[]
  activeCategory?: string
  activeCity?: string
  activeSearch?: string
  activeMin?: string
  activeMax?: string
}

export function ServicesFilters({
  categories,
  locations,
  activeCategory,
  activeCity,
  activeSearch,
  activeMin,
  activeMax,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const buildHref = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams()
      const merged = {
        category: activeCategory,
        q: activeSearch,
        city: activeCity,
        min: activeMin,
        max: activeMax,
        ...overrides,
      }
      for (const [k, v] of Object.entries(merged)) {
        if (v) params.set(k, v)
      }
      const qs = params.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, activeCategory, activeSearch, activeCity, activeMin, activeMax],
  )

  function navigate(href: string) {
    startTransition(() => router.push(href))
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="search"
          defaultValue={activeSearch ?? ''}
          placeholder="Search services…"
          className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate(buildHref({ q: (e.target as HTMLInputElement).value || undefined, category: activeCategory }))
            }
          }}
          onChange={(e) => {
            if (e.target.value === '') navigate(buildHref({ q: undefined }))
          }}
        />
        {activeSearch && (
          <button
            onClick={() => navigate(buildHref({ q: undefined }))}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => navigate(buildHref({ category: undefined }))}
            className={[
              'shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors',
              !activeCategory
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted',
            ].join(' ')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                navigate(
                  buildHref({ category: activeCategory === cat.slug ? undefined : cat.slug }),
                )
              }
              className={[
                'shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors',
                activeCategory === cat.slug
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted',
              ].join(' ')}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* City + price row */}
      <div className="flex flex-wrap gap-3">
        {/* City */}
        <select
          value={activeCity ?? ''}
          onChange={(e) => navigate(buildHref({ city: e.target.value || undefined }))}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.slug} value={loc.city}>
              {loc.city} ({loc.count})
            </option>
          ))}
        </select>

        {/* Min price */}
        <input
          type="number"
          min={0}
          defaultValue={activeMin ?? ''}
          placeholder="Min price (R)"
          className="w-36 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          onBlur={(e) => navigate(buildHref({ min: e.target.value || undefined }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              navigate(buildHref({ min: (e.target as HTMLInputElement).value || undefined }))
          }}
        />

        {/* Max price */}
        <input
          type="number"
          min={0}
          defaultValue={activeMax ?? ''}
          placeholder="Max price (R)"
          className="w-36 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          onBlur={(e) => navigate(buildHref({ max: e.target.value || undefined }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              navigate(buildHref({ max: (e.target as HTMLInputElement).value || undefined }))
          }}
        />

        {/* Clear all */}
        {(activeCategory || activeCity || activeSearch || activeMin || activeMax) && (
          <button
            onClick={() => navigate(pathname)}
            className="rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
