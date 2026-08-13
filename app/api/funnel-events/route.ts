import { NextResponse } from 'next/server'
import type { FunnelEventType } from '@/lib/db'
import { logFunnelEvent } from '@/lib/liquidity/log-funnel-event'

const EVENT_TYPES: FunnelEventType[] = ['search_performed', 'profile_viewed', 'service_viewed', 'review_submitted']

function stringValue(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const eventType = stringValue(body.eventType, 40) as FunnelEventType | null
  const sessionId = stringValue(body.sessionId, 120)
  if (!eventType || !EVENT_TYPES.includes(eventType) || !sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  await logFunnelEvent({
    eventType,
    category: stringValue(body.category, 120),
    city: stringValue(body.city, 120),
    providerId: stringValue(body.providerId, 80),
    sessionId,
    metadata: typeof body.metadata === 'object' && body.metadata !== null
      ? (body.metadata as Record<string, unknown>)
      : {},
  })

  return NextResponse.json({ ok: true })
}
