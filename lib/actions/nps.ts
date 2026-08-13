/**
 * Split satisfaction tracking (Part 3): two independent NPS survey flows,
 * customer (fired once at booking completion) and provider (day 30 post-
 * claim, then quarterly). Delivery goes through a dedicated nps_survey_queue
 * — see supabase/migrations/20260822000000_satisfaction_responses.sql for
 * why this isn't folded into nurture_email_queue.
 *
 * Never blend the two sides in a query — every read must filter on `side`.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendNurtureEmail } from '@/lib/email/resend'
import { SITE_URL } from '@/lib/seo'
import {
  CUSTOMER_NPS_COPY,
  CUSTOMER_NPS_DELAY_HOURS,
  NPS_BATCH_SIZE,
  NPS_MAX_ATTEMPTS,
  PROVIDER_NPS_COPY,
  PROVIDER_NPS_FIRST_SURVEY_DAYS,
  PROVIDER_NPS_QUARTERLY_INTERVAL_DAYS,
} from '@/lib/satisfaction-config'

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function surveyUrl(token: string): string {
  return `${SITE_URL}/nps/${token}`
}

// ── Enqueue: customer, fired once per completed booking ────────────────────

/**
 * Called from transitionBooking's `if (to === 'completed')` block — the one
 * choke point every path to `completed` passes through (customer confirm,
 * the (currently disabled) auto-complete cron, and any future system
 * transition). idempotency_key is booking-scoped, so a retried transition
 * (transitionBooking is itself idempotent on from-state) never double-queues.
 */
export async function enqueueCustomerNps(bookingId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking) return

  const { data: customer } = await admin
    .from('customers')
    .select('auth_provider_id, name')
    .eq('id', booking.customer_id)
    .maybeSingle()
  if (!customer?.auth_provider_id) return

  const { data: userData } = await admin.auth.admin.getUserById(customer.auth_provider_id)
  const email = userData?.user?.email
  if (!email) return

  const scheduledFor = addHours(new Date(), CUSTOMER_NPS_DELAY_HOURS)

  await admin.from('nps_survey_queue').upsert(
    {
      side: 'customer',
      recipient_id: booking.customer_id,
      to_email: email,
      recipient_name: customer.name ?? null,
      booking_id: bookingId,
      scheduled_for: scheduledFor.toISOString(),
      idempotency_key: `customer:${bookingId}`,
    },
    { onConflict: 'idempotency_key', ignoreDuplicates: true },
  )
}

// ── Enqueue: provider, day 30 post-claim then quarterly ────────────────────

/**
 * Scans for providers due their first or next quarterly survey. A provider
 * is "due" for survey N when N * quarterlyIntervalDays (plus the initial
 * firstSurveyDays offset) has elapsed since their claim anchor, and they
 * don't already have a queued/sent survey for that cycle — enforced by the
 * idempotency_key carrying the cycle index.
 *
 * Claim anchor: profile_claims.verified_at for a scraped-then-claimed
 * provider, falling back to providers.created_at for a direct signup
 * (claim_status defaults to 'claimed' with no profile_claims row at all).
 */
export async function enqueueDueProviderNps(): Promise<{ enqueued: number }> {
  const admin = createAdminClient()
  const now = new Date()

  const { data: providers } = await admin
    .from('providers')
    .select('id, auth_provider_id, business_name, claim_status, created_at')
    .eq('is_published', true)
    .eq('claim_status', 'claimed')
    .not('auth_provider_id', 'is', null)

  if (!providers || providers.length === 0) return { enqueued: 0 }

  const providerIds = providers.map((p) => p.id)
  const { data: claims } = await admin
    .from('profile_claims')
    .select('provider_id, verified_at')
    .in('provider_id', providerIds)
    .eq('status', 'verified')
    .not('verified_at', 'is', null)
    .order('verified_at', { ascending: false })

  const anchorByProvider = new Map<string, string>()
  for (const claim of claims ?? []) {
    if (!anchorByProvider.has(claim.provider_id)) {
      anchorByProvider.set(claim.provider_id, claim.verified_at as string)
    }
  }

  let enqueued = 0

  for (const provider of providers) {
    const anchor = new Date(anchorByProvider.get(provider.id) ?? provider.created_at)
    const daysSinceAnchor = (now.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSinceAnchor < PROVIDER_NPS_FIRST_SURVEY_DAYS) continue

    const cyclesElapsed = Math.floor(
      (daysSinceAnchor - PROVIDER_NPS_FIRST_SURVEY_DAYS) / PROVIDER_NPS_QUARTERLY_INTERVAL_DAYS,
    )
    const cycleIndex = Math.max(0, cyclesElapsed)
    const idempotencyKey = `provider:${provider.id}:cycle:${cycleIndex}`

    const { data: userData } = await admin.auth.admin.getUserById(provider.auth_provider_id as string)
    const email = userData?.user?.email
    if (!email) continue

    const { error } = await admin.from('nps_survey_queue').upsert(
      {
        side: 'provider',
        recipient_id: provider.id,
        to_email: email,
        recipient_name: provider.business_name,
        booking_id: null,
        scheduled_for: now.toISOString(),
        idempotency_key: idempotencyKey,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    )

    if (!error) enqueued += 1
  }

  return { enqueued }
}

// ── Send due surveys ─────────────────────────────────────────────────────

interface NpsQueueRow {
  id: string
  side: 'customer' | 'provider'
  to_email: string
  recipient_name: string | null
  survey_token: string
  attempts: number
}

function renderNpsHtml(
  copy: { heading: string; body: string },
  name: string | null,
  token: string,
): string {
  const greeting = name?.trim() ? `Hi ${escapeHtml(name.trim())},` : 'Hi,'
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17231f;max-width:620px;margin:0 auto;padding:24px">
      <p>${greeting}</p>
      <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${escapeHtml(copy.heading)}</h1>
      <p>${escapeHtml(copy.body)}</p>
      <p style="margin:24px 0">
        <a href="${surveyUrl(token)}" style="background:#14684F;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:700">
          Answer in 10 seconds
        </a>
      </p>
    </div>
  `
}

async function deliverNpsRow(row: NpsQueueRow): Promise<boolean> {
  const admin = createAdminClient()
  const copy = row.side === 'customer' ? CUSTOMER_NPS_COPY : PROVIDER_NPS_COPY

  const { data: claimed } = await admin
    .from('nps_survey_queue')
    .update({ status: 'sending', attempts: row.attempts + 1, last_error: null })
    .eq('id', row.id)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle()

  if (!claimed) return false

  const result = await sendNurtureEmail({
    to: row.to_email,
    subject: copy.subject,
    html: renderNpsHtml(copy, row.recipient_name, row.survey_token),
  })

  if (!result.ok) {
    await admin
      .from('nps_survey_queue')
      .update({
        status: row.attempts + 1 >= NPS_MAX_ATTEMPTS ? 'failed' : 'queued',
        last_error: result.error ?? 'Email send failed',
      })
      .eq('id', row.id)
    return false
  }

  await admin
    .from('nps_survey_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
    .eq('id', row.id)

  return true
}

export async function processDueNpsSurveys(options: { batchSize?: number } = {}) {
  const admin = createAdminClient()
  const batchSize = Math.max(1, Math.min(100, options.batchSize ?? NPS_BATCH_SIZE))

  const { data: rows, error } = await admin
    .from('nps_survey_queue')
    .select('id, side, to_email, recipient_name, survey_token, attempts')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', NPS_MAX_ATTEMPTS)
    .order('scheduled_for', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error('processDueNpsSurveys:', error.message)
    return { scanned: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  for (const row of (rows ?? []) as NpsQueueRow[]) {
    const ok = await deliverNpsRow(row)
    if (ok) sent += 1
    else failed += 1
  }

  return { scanned: rows?.length ?? 0, sent, failed }
}

// ── Submit ────────────────────────────────────────────────────────────────

export interface SubmitNpsResult {
  ok: boolean
  error?: string
}

/**
 * Public entry point: a survey_token identifies the queue row, which is the
 * only auth this needs (no session — the customer/provider may click the
 * email link from anywhere). One response per survey, enforced by the
 * partial unique index on satisfaction_responses.survey_id.
 */
export async function submitNpsResponse(input: {
  token: string
  score: number
  verbatim?: string | null
}): Promise<SubmitNpsResult> {
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 10) {
    return { ok: false, error: 'Score must be an integer from 0 to 10.' }
  }

  const admin = createAdminClient()

  const { data: survey } = await admin
    .from('nps_survey_queue')
    .select('id, side, booking_id, recipient_id')
    .eq('survey_token', input.token)
    .maybeSingle()

  if (!survey) return { ok: false, error: 'Survey not found.' }

  const { data: existing } = await admin
    .from('satisfaction_responses')
    .select('id')
    .eq('survey_id', survey.id)
    .maybeSingle()
  if (existing) return { ok: false, error: 'This survey has already been answered.' }

  let category: string | null = null
  let city: string | null = null

  if (survey.side === 'customer' && survey.booking_id) {
    const { data: booking } = await admin
      .from('bookings')
      .select('provider_id')
      .eq('id', survey.booking_id)
      .maybeSingle()
    if (booking) {
      const { data: provider } = await admin
        .from('providers')
        .select('location_city, provider_types(provider_categories(slug))')
        .eq('id', booking.provider_id)
        .maybeSingle()
      city = (provider?.location_city as string | null) ?? null
      const providerType = Array.isArray(provider?.provider_types)
        ? provider.provider_types[0]
        : provider?.provider_types
      const cat = Array.isArray(providerType?.provider_categories)
        ? providerType.provider_categories[0]
        : providerType?.provider_categories
      category = (cat?.slug as string | undefined) ?? null
    }
  } else if (survey.side === 'provider') {
    const { data: provider } = await admin
      .from('providers')
      .select('location_city, provider_types(provider_categories(slug))')
      .eq('id', survey.recipient_id)
      .maybeSingle()
    city = (provider?.location_city as string | null) ?? null
    const providerType = Array.isArray(provider?.provider_types)
      ? provider.provider_types[0]
      : provider?.provider_types
    const cat = Array.isArray(providerType?.provider_categories)
      ? providerType.provider_categories[0]
      : providerType?.provider_categories
    category = (cat?.slug as string | undefined) ?? null
  }

  const { error } = await admin.from('satisfaction_responses').insert({
    side: survey.side,
    score: input.score,
    verbatim: input.verbatim?.trim() || null,
    category,
    city,
    booking_id: survey.booking_id,
    survey_id: survey.id,
  })

  if (error) {
    console.error('submitNpsResponse:', error.message)
    return { ok: false, error: 'Could not save your response.' }
  }

  return { ok: true }
}
