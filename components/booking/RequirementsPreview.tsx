import {
  buildRequirementDefinitions,
  hasAnyRequirement,
} from '@/lib/domain/booking-requirements'

/**
 * Read-only "what this provider will need from you" block.
 *
 * Used on the service page and, in compact form, above the confirm-and-pay
 * action at checkout — requirements are part of what the customer is agreeing
 * to, so they cannot first appear after payment.
 *
 * Renders NOTHING when the package has no requirements: no empty state, no
 * "none required" line.
 */
export function RequirementsPreview({
  requirements,
  requirementFileSlots,
  compact = false,
}: {
  requirements: string | null | undefined
  requirementFileSlots: unknown
  compact?: boolean
}) {
  const parsed = buildRequirementDefinitions({ requirements, requirementFileSlots })

  if (!hasAnyRequirement(parsed)) return null

  const { note, slots } = parsed

  if (compact) {
    return (
      <div className="rounded-xl border bg-muted/40 px-4 py-3">
        <p className="text-sm font-medium">What you&apos;ll need to provide</p>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
        {slots.length > 0 && (
          <ul className="mt-2 space-y-1">
            {slots.map((slot) => (
              <li
                key={slot.sortOrder}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                {slot.label}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          You can upload these from your booking page after checkout.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border p-6">
      <h2 className="font-semibold">What this provider will need from you</h2>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
      {slots.length > 0 && (
        <ul className="mt-4 space-y-2">
          {slots.map((slot) => (
            <li key={slot.sortOrder} className="flex items-start gap-2.5 text-sm">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{slot.label}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        You&apos;ll be able to upload these from your booking page once you&apos;ve booked.
      </p>
    </section>
  )
}
