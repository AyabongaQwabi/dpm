import { Icon } from '@/components/ui/Icon'

interface NameSearchBarProps {
  query: string
  typeSlug: string
  tagFilter: string[]
}

// Standalone, prominent name/keyword search — separate from the type/tag
// filter panel so searching by name doesn't require opening filters first.
// Plain GET form: works without JS, preserves any active type/tag filters.
export function NameSearchBar({ query, typeSlug, tagFilter }: NameSearchBarProps) {
  return (
    <form action="/search" method="get" className="mb-8">
      {typeSlug && <input type="hidden" name="type" value={typeSlug} />}
      {tagFilter.length > 0 && <input type="hidden" name="tags" value={tagFilter.join(',')} />}
      <div className="relative flex items-center gap-2 rounded-2xl border-2 border-border bg-card p-2 shadow-sm focus-within:border-primary-accent">
        <Icon.search className="pointer-events-none ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by provider name, e.g. &ldquo;1st Insurance Brokers&rdquo;"
          className="w-full flex-1 border-0 bg-transparent py-2.5 text-base placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
        >
          Search
        </button>
      </div>
    </form>
  )
}
