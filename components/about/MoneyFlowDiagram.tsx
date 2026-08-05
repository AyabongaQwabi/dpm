const STEPS = [
  { label: 'Customer', detail: 'Pays for the job' },
  { label: 'Provider', detail: 'Completes the work' },
  { label: 'Provider gets paid', detail: 'Funds settle first' },
  { label: 'ServicePros', detail: 'Takes commission' },
] as const

export function MoneyFlowDiagram() {
  return (
    <figure
      role="img"
      aria-label="Money flow: the customer pays, the provider completes the work and gets paid, and only then does ServicePros take its commission."
      className="rounded-2xl border bg-card p-6"
    >
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        {STEPS.map((step, index) => (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
            {index < STEPS.length - 1 && (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 rotate-90 text-primary-accent sm:rotate-0">
                <path d="M2 9h13m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 text-sm leading-6 text-muted-foreground">
        Nothing flows to the platform until it has flowed to the provider.
      </figcaption>
    </figure>
  )
}
