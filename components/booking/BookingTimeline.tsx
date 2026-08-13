import { timelineLine } from '@/lib/domain/booking-status'
import type { BookingStatus } from '@/lib/domain/booking'

export interface TimelineEvent {
  id: string
  fromStatus: string | null
  toStatus: string
  eventType: string
  note: string | null
  createdAt: string
  actorRole: string
}

/**
 * Vertical timeline built from booking_events. Plain language only — no enum
 * names ever reach the page.
 *
 * Non-status events (file uploads, downloads, nudges) share the log, so they
 * are described here rather than run through the status vocabulary.
 */
function describe(
  event: TimelineEvent,
  audience: 'customer' | 'provider',
): string | null {
  if (event.eventType === 'status_change') {
    return timelineLine(event.toStatus as BookingStatus, audience)
  }

  const who = event.actorRole === 'customer' ? 'Customer' : 'Provider'
  const you = audience === event.actorRole

  switch (event.eventType) {
    case 'file_uploaded':
      return you ? `You uploaded ${event.note}` : `${who} uploaded ${event.note}`
    case 'file_removed':
      return you ? `You removed ${event.note}` : `${who} removed ${event.note}`
    case 'file_downloaded':
      return you ? `You downloaded ${event.note}` : `${who} downloaded ${event.note}`
    case 'files_downloaded_archive':
      return you ? `You downloaded all files` : `${who} downloaded all files`
    case 'requirements_nudge':
      return you
        ? 'You sent a reminder about outstanding requirements'
        : 'Provider sent a reminder about outstanding requirements'
    default:
      return null
  }
}

export function BookingTimeline({
  events,
  audience,
}: {
  events: TimelineEvent[]
  audience: 'customer' | 'provider'
}) {
  const items = events
    .map((event) => ({ event, label: describe(event, audience) }))
    .filter((item): item is { event: TimelineEvent; label: string } => !!item.label)

  if (items.length === 0) return null

  return (
    <section className="rounded-2xl border p-6">
      <h2 className="font-semibold">Activity</h2>
      <ol className="mt-4 space-y-4">
        {items.map(({ event, label }, index) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  index === items.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40'
                }`}
              />
              {index < items.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
              )}
            </div>
            <div className="pb-1">
              <p className="text-sm">{label}</p>
              {event.eventType === 'status_change' && event.note && (
                <p className="mt-0.5 text-sm text-muted-foreground">{event.note}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
