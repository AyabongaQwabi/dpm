// Pure Pro membership logic — no framework or DB imports.

import { ENTITLEMENT_GRANTS, PRO_MEMBERSHIP_SOURCES, type EntitlementKey } from '../entitlements'

export type ProMembershipStatus = 'active' | 'lapsed' | 'cancelled'
export type ProMembershipSource = (typeof PRO_MEMBERSHIP_SOURCES)[number]

export interface ProMembershipRow {
  status: ProMembershipStatus
  source: ProMembershipSource
  current_period_end: string | null
}

/**
 * Whether a membership row currently grants the given entitlement key.
 * Only 'active' status counts — 'lapsed' and 'cancelled' grant nothing,
 * regardless of source. current_period_end is informational only here;
 * the transition to 'lapsed' happens explicitly (see lib/actions/pro-membership.ts),
 * this function does not infer lapse from a stale timestamp.
 */
export function membershipGrants(
  membership: ProMembershipRow | null,
  key: EntitlementKey,
): boolean {
  if (!membership) return false
  if (membership.status !== 'active') return false
  return ENTITLEMENT_GRANTS[key].includes(membership.source)
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function addOneMonth(from: Date = new Date()): Date {
  const end = new Date(from)
  end.setMonth(end.getMonth() + 1)
  return end
}

export function addOneYear(from: Date = new Date()): Date {
  const end = new Date(from)
  end.setFullYear(end.getFullYear() + 1)
  return end
}

export function daysRemaining(periodEnd: string | Date, now: Date = new Date()): number {
  const end = periodEnd instanceof Date ? periodEnd : new Date(periodEnd)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / MS_PER_DAY))
}

/**
 * Whether a purchased membership is still inside its refund-eligible
 * cancellation window (PRO_CANCELLATION_REFUND_WINDOW_HOURS from started_at).
 */
export function isWithinCancellationRefundWindow(
  startedAt: string | Date,
  windowHours: number,
  now: Date = new Date(),
): boolean {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt)
  const windowMs = windowHours * 60 * 60 * 1000
  return now.getTime() - start.getTime() < windowMs
}
