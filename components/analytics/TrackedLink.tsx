'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { ProviderAnalyticsEventType } from '@/lib/db'
import { trackProviderEvent } from '@/components/analytics/ProviderAnalyticsTracker'

interface TrackedLinkProps {
  href: string
  providerId: string
  serviceId?: string | null
  eventType: ProviderAnalyticsEventType
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function TrackedLink({
  href,
  providerId,
  serviceId,
  eventType,
  className,
  style,
  children,
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => {
        trackProviderEvent({ providerId, serviceId, eventType })
      }}
    >
      {children}
    </Link>
  )
}
