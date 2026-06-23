const STATUS_META: Record<string, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700 border-red-200' },
  disputed: { label: 'Disputed', className: 'bg-orange-100 text-orange-800 border-orange-200' },
}

export function BookingStatusBadge({ status, cancellationReason }: { status: string; cancellationReason?: string | null }) {
  const isDispute = status === 'cancelled' && cancellationReason === '__dispute__'
  const key = isDispute ? 'disputed' : status
  const meta = STATUS_META[key] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${meta.className}`}>
      {meta.label}
    </span>
  )
}
