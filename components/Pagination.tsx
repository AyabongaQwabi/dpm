import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

interface PaginationProps {
  page: number
  totalPages: number
  /** Builds the href for a given page number, e.g. (p) => `/search?q=x&page=${p}` */
  hrefForPage: (page: number) => string
}

// Plain <Link>-based pager — works without JS, server-rendered, SEO-friendly
// (each page gets a real crawlable URL rather than a client-side fetch).
export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null

  const pageNumbers = visiblePageNumbers(page, totalPages)

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink
        href={page > 1 ? hrefForPage(page - 1) : undefined}
        disabled={page <= 1}
        ariaLabel="Previous page"
      >
        <Icon.arrowRight className="h-4 w-4 rotate-180" weight="bold" />
      </PageLink>

      {pageNumbers.map((entry, i) =>
        entry === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <PageLink key={entry} href={hrefForPage(entry)} active={entry === page} ariaLabel={`Page ${entry}`}>
            {entry}
          </PageLink>
        ),
      )}

      <PageLink
        href={page < totalPages ? hrefForPage(page + 1) : undefined}
        disabled={page >= totalPages}
        ariaLabel="Next page"
      >
        <Icon.arrowRight className="h-4 w-4" weight="bold" />
      </PageLink>
    </nav>
  )
}

function visiblePageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  const windowSize = 1
  const pages = new Set<number>([1, totalPages])
  for (let p = page - windowSize; p <= page + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis')
    result.push(sorted[i])
  }
  return result
}

function PageLink({
  href,
  active,
  disabled,
  ariaLabel,
  children,
}: {
  href?: string
  active?: boolean
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
}) {
  const baseClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-colors'

  if (disabled || !href) {
    return (
      <span aria-hidden="true" aria-label={ariaLabel} className={`${baseClass} cursor-not-allowed text-muted-foreground/40`}>
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? `${baseClass} bg-primary-accent text-primary-accent-foreground`
          : `${baseClass} text-foreground hover:bg-muted`
      }
    >
      {children}
    </Link>
  )
}
