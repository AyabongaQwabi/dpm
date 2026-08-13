/**
 * Server-only write path for funnel_events. Pre-booking funnel steps only —
 * search_performed, service_viewed, review_submitted. Booking-lifecycle
 * steps are read at query time from booking_status_history instead of
 * logged here; see supabase/migrations/20260820000000_funnel_events.sql.
 *
 * category is a resolved category slug, city is providers.location_city
 * verbatim (there is no cities table in this schema — see the liquidity
 * recon report). Failures are swallowed: funnel logging must never break
 * the page it's called from.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { FunnelEventType } from '@/lib/db'

interface LogFunnelEventInput {
  eventType: FunnelEventType
  category?: string | null
  city?: string | null
  providerId?: string | null
  sessionId: string
  metadata?: Record<string, unknown>
}

export async function logFunnelEvent(input: LogFunnelEventInput): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('funnel_events').insert({
    event_type: input.eventType,
    category: input.category ?? null,
    city: input.city ?? null,
    provider_id: input.providerId ?? null,
    session_id: input.sessionId,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.error('funnel event insert failed:', error.message)
  }
}
