'use client'

import { useEffect, useRef } from 'react'
import type { ProviderAnalyticsEventType } from '@/lib/db'

interface ProviderAnalyticsTrackerProps {
  providerId: string
  serviceId?: string | null
  eventType: ProviderAnalyticsEventType
  source?: string
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
  providerId: string
  serviceId?: string | null
  eventType: ProviderAnalyticsEventType
  source?: string
  metadata?: Record<string, unknown>
}) {
  const body = JSON.stringify({
    ...payload,
    source: payload.source ?? 'site',
    sessionId: sessionId(),
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
  })

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/provider-analytics', blob)
    return
  }

  void fetch('/api/provider-analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  })
}

export function trackProviderEvent(payload: {
  providerId: string
  serviceId?: string | null
  eventType: ProviderAnalyticsEventType
  source?: string
  metadata?: Record<string, unknown>
}) {
  if (typeof window === 'undefined') return
  sendEvent(payload)
}

export function ProviderAnalyticsTracker({
  providerId,
  serviceId,
  eventType,
  source = 'site',
}: ProviderAnalyticsTrackerProps) {
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true

    const dedupeKey = `servicepros.analytics_sent:${eventType}:${providerId}:${serviceId ?? 'profile'}:${window.location.pathname}`
    if (window.sessionStorage.getItem(dedupeKey)) return
    window.sessionStorage.setItem(dedupeKey, '1')

    sendEvent({ providerId, serviceId, eventType, source })
  }, [eventType, providerId, serviceId, source])

  return null
}
