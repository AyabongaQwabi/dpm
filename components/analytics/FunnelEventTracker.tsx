'use client'

// Client-side firing of the pre-booking funnel_events (search_performed,
// service_viewed). Mirrors components/analytics/ProviderAnalyticsTracker.tsx:
// same sessionStorage-backed anonymous session id, same sendBeacon-first
// dispatch, no new browser storage API introduced.

import { useEffect, useRef } from 'react'
import type { FunnelEventType } from '@/lib/db'

interface FunnelEventTrackerProps {
  eventType: FunnelEventType
  category?: string | null
  city?: string | null
  providerId?: string | null
  dedupeKey: string
  metadata?: Record<string, unknown>
}

function sessionId(): string {
  const key = 'servicepros.analytics_session'
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.sessionStorage.setItem(key, created)
  return created
}

function sendEvent(payload: {
  eventType: FunnelEventType
  category?: string | null
  city?: string | null
  providerId?: string | null
  metadata?: Record<string, unknown>
}) {
  const body = JSON.stringify({ ...payload, sessionId: sessionId() })

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/funnel-events', blob)
    return
  }

  void fetch('/api/funnel-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  })
}

export function FunnelEventTracker({
  eventType,
  category,
  city,
  providerId,
  dedupeKey,
  metadata,
}: FunnelEventTrackerProps) {
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true

    const storageKey = `servicepros.funnel_sent:${eventType}:${dedupeKey}`
    if (window.sessionStorage.getItem(storageKey)) return
    window.sessionStorage.setItem(storageKey, '1')

    sendEvent({ eventType, category, city, providerId, metadata })
  }, [eventType, category, city, providerId, dedupeKey, metadata])

  return null
}
