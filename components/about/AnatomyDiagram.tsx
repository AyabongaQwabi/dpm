const PARTS = [
  {
    letter: 'D',
    label: 'Directory',
    body: 'Discoverability. Category and city pages, search, SEO, real profiles instead of adverts. Being findable is the entry point, not the product.',
  },
  {
    letter: 'P',
    label: 'Provider',
    body: 'The business itself, not a listing. A real profile, services, gallery, stories, verification, reviews, a dashboard. The provider owns their presence.',
  },
  {
    letter: 'M',
    label: 'Marketplace',
    body: 'The transaction. Customers can book, pay, and review without leaving, and reputation is tied to completed work.',
  },
] as const

export function AnatomyDiagram() {
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {PARTS.map((part, index) => (
        <li key={part.letter} className="relative rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold text-primary-accent">{part.letter}</span>
            <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{part.label}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{part.body}</p>
          {index < PARTS.length - 1 && (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -right-4 hidden -translate-y-1/2 text-border sm:block"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path d="M2 8h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  )
}
