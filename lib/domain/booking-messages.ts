/**
 * Pure rules for the booking-scoped message thread.
 *
 * Kept out of lib/actions/booking-messages.ts because a 'use server' module
 * may only export async functions — and because these are the bits worth
 * unit-testing directly.
 *
 * Pure — no DB, no framework imports (ARCH-006).
 */

/**
 * Plain text only. Strips anything that could be interpreted as markup on the
 * way in, so no rendering surface has to trust the stored value.
 */
export function sanitiseMessageBody(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
    .slice(0, 5000)
}

/**
 * Is the provider still inside the nudge cooldown? Returns the number of
 * whole hours remaining, or 0 when a reminder may be sent.
 */
export function nudgeHoursRemaining(params: {
  lastNudgeAt: string | Date | null
  rateLimitHours: number
  now: Date
}): number {
  if (!params.lastNudgeAt) return 0

  const last =
    params.lastNudgeAt instanceof Date
      ? params.lastNudgeAt
      : new Date(params.lastNudgeAt)

  const readyAt = last.getTime() + params.rateLimitHours * 60 * 60 * 1000
  const remainingMs = readyAt - params.now.getTime()

  return remainingMs <= 0 ? 0 : Math.ceil(remainingMs / (60 * 60 * 1000))
}

/**
 * Whether the thread still accepts new messages. A thread closes
 * `closeAfterDays` after the booking reached `completed`, then goes read-only.
 * Any non-completed booking is always open.
 */
export function isThreadOpen(params: {
  status: string
  completedAt: string | Date | null
  closeAfterDays: number
  now?: Date
}): boolean {
  if (params.status !== 'completed') return true
  if (!params.completedAt) return true

  const completed =
    params.completedAt instanceof Date
      ? params.completedAt
      : new Date(params.completedAt)

  const now = params.now ?? new Date()
  const closesAt =
    completed.getTime() + params.closeAfterDays * 24 * 60 * 60 * 1000

  return now.getTime() < closesAt
}
