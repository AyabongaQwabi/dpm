'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

interface FilterOption {
  slug: string
  name: string
}

interface SearchFiltersProps {
  query: string
  typeSlug: string
  tagFilter: string[]
  providerTypes: FilterOption[]
  tags: string[]
}

// Bold, tappable filter controls designed to scale to large taxonomies
// (dozens of provider types / tags). Long lists become searchable, scrollable
// pickers with selected-chip summaries rather than walls of pills. Provider
// type is single-select, tags are multi-select. State is local; navigation
// happens on Apply so the server component can re-run the ranked search.
// Name search lives separately in NameSearchBar — filters here narrow by
// type/tag only, preserving the current ?q= (read from the server-rendered
// query prop, not useSearchParams, so this component doesn't need a Suspense
// boundary) on apply/reset.
export function SearchFilters({
  query,
  typeSlug,
  tagFilter,
  providerTypes,
  tags,
}: SearchFiltersProps) {
  const router = useRouter()
  const [type, setType] = useState(typeSlug)
  const [selectedTags, setSelectedTags] = useState<string[]>(tagFilter)

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function apply() {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (type) params.set('type', type)
    if (selectedTags.length) params.set('tags', selectedTags.join(','))
    router.push(`/search${params.toString() ? `?${params}` : ''}`)
  }

  function reset() {
    setType('')
    setSelectedTags([])
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  const hasActiveFilters = Boolean(type) || selectedTags.length > 0
  const activeTypeName = providerTypes.find((pt) => pt.slug === type)?.name

  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="mb-1 text-sm font-semibold text-foreground">Filters</p>
      <p className="mb-4 text-xs text-muted-foreground">Narrow results by provider type or tag.</p>

      {providerTypes.length > 0 && (
        <ProviderTypePicker
          options={providerTypes}
          selected={type}
          selectedName={activeTypeName}
          onSelect={(slug) => setType(slug)}
        />
      )}

      {tags.length > 0 && (
        <TagPicker tags={tags} selected={selectedTags} onToggle={toggleTag} onClear={() => setSelectedTags([])} />
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={apply}
          className="flex-1 rounded-xl bg-primary-accent py-2.5 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
        >
          Apply filters
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

// Single-select provider type. Renders a searchable, scrollable list once the
// taxonomy grows past a handful of entries so 70+ types stay usable.
function ProviderTypePicker({
  options,
  selected,
  selectedName,
  onSelect,
}: {
  options: FilterOption[]
  selected: string
  selectedName?: string
  onSelect: (slug: string) => void
}) {
  const [search, setSearch] = useState('')
  const searchable = options.length > 8

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return options
    return options.filter((o) => o.name.toLowerCase().includes(needle))
  }, [options, search])

  return (
    <div className="mt-5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Provider type
        </p>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect('')}
            className="text-xs font-medium text-primary-accent hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Current selection summary */}
      {selectedName && (
        <div className="mb-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary-accent bg-primary-accent px-3 py-1 text-sm font-medium text-primary-accent-foreground">
          <Icon.verified className="h-3.5 w-3.5 shrink-0" weight="fill" />
          <span className="truncate">{selectedName}</span>
        </div>
      )}

      {searchable && (
        <div className="relative mb-2">
          <Icon.search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${options.length} types…`}
            className="w-full rounded-lg border bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent"
          />
        </div>
      )}

      <div
        className={[
          'flex flex-col gap-0.5',
          searchable ? 'max-h-56 overflow-y-auto rounded-xl border bg-background p-1' : '',
        ].join(' ')}
        role="listbox"
        aria-label="Provider type"
      >
        {!search.trim() && (
          <OptionRow active={!selected} onClick={() => onSelect('')}>
            All types
          </OptionRow>
        )}
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No matching types</p>
        ) : (
          filtered.map((pt) => (
            <OptionRow
              key={pt.slug}
              active={selected === pt.slug}
              onClick={() => onSelect(selected === pt.slug ? '' : pt.slug)}
            >
              {pt.name}
            </OptionRow>
          ))
        )}
      </div>
    </div>
  )
}

// Multi-select tags. Selected tags surface as removable chips; the full set is
// searchable + scrollable so large tag vocabularies stay manageable.
function TagPicker({
  tags,
  selected,
  onToggle,
  onClear,
}: {
  tags: string[]
  selected: string[]
  onToggle: (tag: string) => void
  onClear: () => void
}) {
  const [search, setSearch] = useState('')
  const searchable = tags.length > 8

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tags
    return tags.filter((t) => t.toLowerCase().includes(needle))
  }, [tags, search])

  return (
    <div className="mt-5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
          {selected.length > 0 && <span className="ml-1.5 text-primary-accent">({selected.length})</span>}
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary-accent hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Selected tag chips */}
      {selected.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-primary-accent bg-primary-accent px-2.5 py-1 text-xs font-medium text-primary-accent-foreground"
            >
              {tag}
              <Icon.close className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {searchable && (
        <div className="relative mb-2">
          <Icon.search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${tags.length} tags…`}
            className="w-full rounded-lg border bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent"
          />
        </div>
      )}

      <div
        className={[
          'flex flex-wrap gap-2',
          searchable ? 'max-h-44 overflow-y-auto rounded-xl border bg-background p-2.5' : '',
        ].join(' ')}
      >
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">No matching tags</p>
        ) : (
          filtered.map((tag) => {
            const active = selected.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary-accent bg-primary-accent text-primary-accent-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {active && <Icon.verified className="h-3.5 w-3.5" weight="fill" />}
                {tag}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function OptionRow({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="option"
      aria-selected={active}
      className={[
        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        active
          ? 'bg-primary-accent font-semibold text-primary-accent-foreground'
          : 'font-medium text-foreground hover:bg-muted',
      ].join(' ')}
    >
      <span className="truncate">{children}</span>
      {active && <Icon.verified className="h-4 w-4 shrink-0" weight="fill" />}
    </button>
  )
}
