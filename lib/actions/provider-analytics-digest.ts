import { createAdminClient } from '@/lib/supabase/admin'
import { sendAnalyticsDigestEmail } from '@/lib/email/resend'
import { SITE_URL } from '@/lib/seo'
import { loadProviderAnalyticsSummary } from '@/lib/provider-analytics'
import { getProviderAuthEmail } from '@/lib/payments/verify-subscription'

const ANALYTICS_DIGEST_BATCH_SIZE = 50
const ANALYTICS_DIGEST_MAX_ATTEMPTS = 3

interface DigestQueueRow {
  id: string
  provider_id: string
  to_email: string
  recipient_name: string | null
  period_start: string
  period_end: string
  attempts: number
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function metricValue(summary: Awaited<ReturnType<typeof loadProviderAnalyticsSummary>>, key: string): number | null {
  const range = summary.ranges.find((item) => item.days === 7)
  return range?.metrics.find((metric) => metric.key === key)?.value ?? null
}

function formatCount(value: number | null): string {
  return String(Math.round(value ?? 0))
}

function renderDigestHtml(input: {
  businessName: string
  profileViews: number
  serviceViews: number
  bookingsStarted: number
  bookingsCompleted: number
  reviewCount: number
  averageRating: number | null
  unsubscribeUrl: string
}): string {
  const rating = input.averageRating === null ? '-' : input.averageRating.toFixed(1)

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17231f;max-width:620px;margin:0 auto;padding:24px">
      <p>Hi ${escapeHtml(input.businessName)},</p>
      <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${formatCount(input.profileViews)} profile views this week, ${formatCount(input.bookingsStarted)} bookings started</h1>
      <ul>
        <li>Profile views: ${formatCount(input.profileViews)}</li>
        <li>Service views: ${formatCount(input.serviceViews)}</li>
        <li>Bookings started: ${formatCount(input.bookingsStarted)}</li>
        <li>Bookings completed: ${formatCount(input.bookingsCompleted)}</li>
        <li>Reviews: ${formatCount(input.reviewCount)}</li>
        <li>Average rating: ${rating}</li>
      </ul>
      <p style="margin:24px 0">
        <a href="${SITE_URL}/provider-dashboard" style="background:#14684F;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:700">
          View analytics
        </a>
      </p>
      <p style="font-size:13px;color:#66736d">
        <a href="${input.unsubscribeUrl}">Unsubscribe from weekly analytics digests</a>
      </p>
    </div>
  `
}

async function ensureDigestPreference(providerId: string): Promise<{ optIn: boolean; token: string | null }> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('provider_notification_preferences')
    .select('analytics_digest_opt_in, unsubscribe_token')
    .eq('provider_id', providerId)
    .maybeSingle()

  if (existing) {
    return {
      optIn: Boolean(existing.analytics_digest_opt_in),
      token: (existing.unsubscribe_token as string | null) ?? null,
    }
  }

  const { data: created } = await admin
    .from('provider_notification_preferences')
    .insert({ provider_id: providerId })
    .select('analytics_digest_opt_in, unsubscribe_token')
    .single()

  return {
    optIn: Boolean(created?.analytics_digest_opt_in ?? true),
    token: (created?.unsubscribe_token as string | null) ?? null,
  }
}

export async function enqueueWeeklyAnalyticsDigests(now: Date = new Date()): Promise<{ enqueued: number; skipped: number }> {
  if (now.getUTCDay() !== 1) return { enqueued: 0, skipped: 0 }

  const admin = createAdminClient()
  const periodEnd = now
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: memberships } = await admin
    .from('pro_memberships')
    .select('provider_id, providers!inner(id, business_name, auth_provider_id)')
    .eq('status', 'active')

  let enqueued = 0
  let skipped = 0

  for (const membership of memberships ?? []) {
    const provider = Array.isArray(membership.providers) ? membership.providers[0] : membership.providers
    if (!provider?.id || !provider.auth_provider_id) {
      skipped += 1
      continue
    }

    const preference = await ensureDigestPreference(provider.id)
    if (!preference.optIn) {
      skipped += 1
      continue
    }

    const email = await getProviderAuthEmail(provider.id)
    if (!email) {
      skipped += 1
      continue
    }

    const { error } = await admin.from('analytics_digest_queue').upsert(
      {
        provider_id: provider.id,
        to_email: email,
        recipient_name: provider.business_name,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        scheduled_for: now.toISOString(),
        idempotency_key: `provider:${provider.id}:analytics:${periodEnd.toISOString().slice(0, 10)}`,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    )

    if (error) skipped += 1
    else enqueued += 1
  }

  return { enqueued, skipped }
}

async function markQueued(id: string, attempts: number, error: string) {
  const admin = createAdminClient()
  await admin
    .from('analytics_digest_queue')
    .update({
      status: attempts >= ANALYTICS_DIGEST_MAX_ATTEMPTS ? 'failed' : 'queued',
      attempts,
      last_error: error,
    })
    .eq('id', id)
}

async function deliverDigestRow(row: DigestQueueRow): Promise<boolean> {
  const admin = createAdminClient()

  const preference = await ensureDigestPreference(row.provider_id)
  if (!preference.optIn) {
    await admin
      .from('analytics_digest_queue')
      .update({ status: 'skipped', last_error: 'Provider opted out' })
      .eq('id', row.id)
    return false
  }

  const { data: claimed } = await admin
    .from('analytics_digest_queue')
    .update({ status: 'sending', attempts: row.attempts + 1, last_error: null })
    .eq('id', row.id)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle()

  if (!claimed) return false

  const summary = await loadProviderAnalyticsSummary({ providerId: row.provider_id, canViewAnalytics: true })
  const profileViews = metricValue(summary, 'profileViews') ?? 0
  const serviceViews = metricValue(summary, 'serviceViews') ?? 0
  const bookingsStarted = metricValue(summary, 'bookingsStarted') ?? 0
  const bookingsCompleted = metricValue(summary, 'bookingsCompleted') ?? 0
  const reviewCount = metricValue(summary, 'reviewCount') ?? 0
  const averageRating = metricValue(summary, 'averageRating')
  const unsubscribeUrl = `${SITE_URL}/api/provider-analytics/unsubscribe?token=${encodeURIComponent(preference.token ?? '')}`
  const businessName = row.recipient_name?.trim() || 'there'
  const subject = `${formatCount(profileViews)} profile views this week`

  const result = await sendAnalyticsDigestEmail({
    to: row.to_email,
    subject,
    html: renderDigestHtml({
      businessName,
      profileViews,
      serviceViews,
      bookingsStarted,
      bookingsCompleted,
      reviewCount,
      averageRating,
      unsubscribeUrl,
    }),
  })

  if (!result.ok) {
    await markQueued(row.id, row.attempts + 1, result.error ?? 'Email send failed')
    return false
  }

  await admin
    .from('analytics_digest_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
    .eq('id', row.id)

  return true
}

export async function processDueAnalyticsDigests(options: { batchSize?: number } = {}) {
  const admin = createAdminClient()
  const batchSize = Math.max(1, Math.min(100, options.batchSize ?? ANALYTICS_DIGEST_BATCH_SIZE))

  const { data: rows, error } = await admin
    .from('analytics_digest_queue')
    .select('id, provider_id, to_email, recipient_name, period_start, period_end, attempts')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', ANALYTICS_DIGEST_MAX_ATTEMPTS)
    .order('scheduled_for', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error('processDueAnalyticsDigests:', error.message)
    return { scanned: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  for (const row of (rows ?? []) as DigestQueueRow[]) {
    const ok = await deliverDigestRow(row)
    if (ok) sent += 1
    else failed += 1
  }

  return { scanned: rows?.length ?? 0, sent, failed }
}

export async function unsubscribeAnalyticsDigest(token: string): Promise<boolean> {
  if (!token.trim()) return false

  const admin = createAdminClient()
  const { data } = await admin
    .from('provider_notification_preferences')
    .update({ analytics_digest_opt_in: false })
    .eq('unsubscribe_token', token.trim())
    .select('provider_id')
    .maybeSingle()

  return Boolean(data)
}
