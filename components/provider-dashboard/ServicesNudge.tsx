'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DISMISSED_KEY = 'dpm_services_nudge_dismissed'

interface ServicesNudgeProps {
  hasServices: boolean
}

export function ServicesNudge({ hasServices }: ServicesNudgeProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (hasServices) return
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (!dismissed) setVisible(true)
    } catch {
      // localStorage unavailable — don't show
    }
  }, [hasServices])

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {}
    setVisible(false)
  }

  if (!visible || hasServices) return null

  return (
    <div
      role="status"
      className="relative mx-4 mt-6 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-4"
    >
      {/* Pointer triangle */}
      <div className="absolute -top-2 left-8 w-4 h-2 overflow-hidden">
        <div className="w-3 h-3 bg-primary/5 border-l border-t border-primary/20 rotate-45 translate-y-1 mx-auto" />
      </div>

      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
          <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
          <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
          <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" />
          <path d="M10 9.5C10 8.67 9.33 8 8.5 8H3.5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">Next step: add your first service</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your profile is live, but it&apos;s not bookable yet. Head to{' '}
          <Link
            href="/provider-dashboard/services"
            className="text-primary font-medium hover:underline"
            onClick={dismiss}
          >
            My Services
          </Link>{' '}
          to create your first service with an article and pricing packages.
        </p>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
