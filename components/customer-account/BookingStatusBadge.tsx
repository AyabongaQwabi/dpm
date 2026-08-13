import { statusLabel, statusTone } from '@/lib/domain/booking-status'
import type { BookingStatus } from '@/lib/domain/booking'

/**
 * Labels and the legacy-dispute fold now come from lib/domain/booking-status.ts
 * — the single source for turning a stored status into words. This component
 * only owns the colour treatment.
 */
const TONE_CLASS: Record<string, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  info: 'bg-amber-100 text-amber-800 border-amber-200',
  progress: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-orange-100 text-orange-800 border-orange-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
}

export function BookingStatusBadge({
  status,
  cancellationReason,
}: {
  status: string
  cancellationReason?: string | null
}) {
  const label = statusLabel(status as BookingStatus, cancellationReason)
  const tone = statusTone(status as BookingStatus, cancellationReason)

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        TONE_CLASS[tone] ?? TONE_CLASS.neutral
      }`}
    >
      {label}
    </span>
  )
}
