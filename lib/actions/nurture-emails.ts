import { createAdminClient } from '@/lib/supabase/admin'
import { sendNurtureEmail } from '@/lib/email/resend'
import { SITE_URL } from '@/lib/seo'
import {
  getNurtureSequence,
  getNurtureStep,
  NURTURE_EMAIL_BATCH_SIZE,
  NURTURE_EMAIL_MAX_ATTEMPTS,
  type NurtureAudience,
  type NurtureEmailStep,
} from '@/lib/nurture-emails-config'

interface EnqueueInput {
  audience: NurtureAudience
  recipientId: string
  email: string
  name?: string | null
  enrolledAt?: Date
}

export interface NurtureQueueRow {
  id: string
  audience: NurtureAudience
  recipient_id: string
  to_email: string
  recipient_name: string | null
  sequence_key: string
  step_key: string
  step_index: number
  scheduled_for: string
  status: 'queued' | 'sending' | 'sent' | 'skipped' | 'failed'
  attempts: number
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function renderNurtureHtml(step: NurtureEmailStep, name: string | null): string {
  const greeting = name?.trim() ? `Hi ${escapeHtml(name.trim())},` : 'Hi,'
  const bullets = step.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')
  const ctaUrl = absoluteUrl(step.ctaPath)

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17231f;max-width:620px;margin:0 auto;padding:24px">
      <p>${greeting}</p>
      <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px">${escapeHtml(step.heading)}</h1>
      <p>${escapeHtml(step.body)}</p>
      <ul>${bullets}</ul>
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="background:#14684F;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:700">
          ${escapeHtml(step.ctaLabel)}
        </a>
      </p>
      <p style="font-size:13px;color:#66736d">ServicePros sends onboarding emails to help you get started. You can manage notification preferences from your account settings where available.</p>
    </div>
  `
}

export async function enqueueNurtureSequence(input: EnqueueInput): Promise<{ enqueued: number }> {
  const email = input.email.trim().toLowerCase()
  if (!email) return { enqueued: 0 }

  const admin = createAdminClient()
  const sequence = getNurtureSequence(input.audience)
  const enrolledAt = input.enrolledAt ?? new Date()
  const rows = sequence.steps.map((step, index) => ({
    audience: input.audience,
    recipient_id: input.recipientId,
    to_email: email,
    recipient_name: input.name ?? null,
    sequence_key: sequence.sequenceKey,
    step_key: step.stepKey,
    step_index: index,
    scheduled_for: addDays(enrolledAt, step.offsetDays).toISOString(),
    idempotency_key: `${input.audience}:${input.recipientId}:${sequence.sequenceKey}:${step.stepKey}`,
    metadata: {},
  }))

  const { error } = await admin
    .from('nurture_email_queue')
    .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })

  if (error) {
    console.error('enqueueNurtureSequence:', error.message)
    return { enqueued: 0 }
  }

  return { enqueued: rows.length }
}

async function markQueued(id: string, attempts: number, error: string) {
  const admin = createAdminClient()
  await admin
    .from('nurture_email_queue')
    .update({
      status: attempts >= NURTURE_EMAIL_MAX_ATTEMPTS ? 'failed' : 'queued',
      attempts,
      last_error: error,
    })
    .eq('id', id)
}

async function deliverNurtureRow(row: NurtureQueueRow): Promise<boolean> {
  const admin = createAdminClient()
  const step = getNurtureStep(row.audience, row.step_key)

  if (!step) {
    await admin
      .from('nurture_email_queue')
      .update({ status: 'skipped', last_error: 'Step removed from config' })
      .eq('id', row.id)
    return false
  }

  const { data: claimed } = await admin
    .from('nurture_email_queue')
    .update({ status: 'sending', attempts: row.attempts + 1, last_error: null })
    .eq('id', row.id)
    .eq('status', 'queued')
    .select('id, attempts')
    .maybeSingle()

  if (!claimed) return false

  const result = await sendNurtureEmail({
    to: row.to_email,
    subject: step.subject,
    html: renderNurtureHtml(step, row.recipient_name),
  })

  if (!result.ok) {
    await markQueued(row.id, row.attempts + 1, result.error ?? 'Email send failed')
    return false
  }

  await admin
    .from('nurture_email_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
    .eq('id', row.id)

  return true
}

export async function processDueNurtureEmails(options: { batchSize?: number } = {}) {
  const admin = createAdminClient()
  const batchSize = Math.max(1, Math.min(100, options.batchSize ?? NURTURE_EMAIL_BATCH_SIZE))

  const { data: rows, error } = await admin
    .from('nurture_email_queue')
    .select('id, audience, recipient_id, to_email, recipient_name, sequence_key, step_key, step_index, scheduled_for, status, attempts')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', NURTURE_EMAIL_MAX_ATTEMPTS)
    .order('scheduled_for', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error('processDueNurtureEmails:', error.message)
    return { scanned: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  for (const row of (rows ?? []) as NurtureQueueRow[]) {
    const ok = await deliverNurtureRow(row)
    if (ok) sent += 1
    else failed += 1
  }

  return { scanned: rows?.length ?? 0, sent, failed }
}

export async function processImmediateNurtureWelcome(
  audience: NurtureAudience,
  recipientId: string,
): Promise<void> {
  const admin = createAdminClient()
  const sequence = getNurtureSequence(audience)
  const welcome = sequence.steps.find((step) => step.offsetDays === 0)
  if (!welcome) return

  const { data: row } = await admin
    .from('nurture_email_queue')
    .select('id, audience, recipient_id, to_email, recipient_name, sequence_key, step_key, step_index, scheduled_for, status, attempts')
    .eq('audience', audience)
    .eq('recipient_id', recipientId)
    .eq('sequence_key', sequence.sequenceKey)
    .eq('step_key', welcome.stepKey)
    .eq('status', 'queued')
    .maybeSingle()

  if (row) await deliverNurtureRow(row as NurtureQueueRow)
}
