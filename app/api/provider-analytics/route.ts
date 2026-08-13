import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { ProviderAnalyticsEventType } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'

const EVENT_TYPES: ProviderAnalyticsEventType[] = [
  'profile_view',
  'service_view',
  'service_booking_click',
  'profile_contact_click',
  'profile_service_click',
  'profile_share_click',
]

function stringValue(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function hash(value: string | null): string | null {
  if (!value) return null
  return createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 32)
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const providerId = stringValue(body.providerId, 80)
  const serviceId = stringValue(body.serviceId, 80)
  const eventType = stringValue(body.eventType, 80) as ProviderAnalyticsEventType | null
  if (!providerId || !eventType || !EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: provider } = await admin
    .from('providers')
    .select('id, is_published')
    .eq('id', providerId)
    .eq('is_published', true)
    .maybeSingle()
  if (!provider) return NextResponse.json({ ok: false }, { status: 404 })

  if (serviceId) {
    const { data: service } = await admin
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('provider_id', providerId)
      .eq('is_published', true)
      .maybeSingle()
    if (!service) return NextResponse.json({ ok: false }, { status: 404 })
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const sessionId = stringValue(body.sessionId, 120)
  const path = stringValue(body.path, 500)
  const referrer = stringValue(body.referrer, 500)
  const source = stringValue(body.source, 80) ?? 'site'
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null

  const { error } = await admin.from('provider_analytics_events').insert({
    provider_id: providerId,
    service_id: serviceId,
    event_type: eventType,
    source,
    path,
    referrer,
    session_hash: hash(`${sessionId ?? ''}:${forwarded ?? ''}`),
    user_agent: userAgent,
    metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {},
  })

  if (error) {
    console.error('provider analytics insert failed:', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
