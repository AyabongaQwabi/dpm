'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 10

/**
 * Yoco has no verify-by-reference endpoint — payment confirmation only
 * arrives via webhook, which is usually faster than this redirect but not
 * guaranteed. Shown when the server component didn't find the transaction
 * yet; refreshes the route periodically so the server component re-checks.
 */
export function PaymentPendingNotice() {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= MAX_POLLS) return
    const timer = setTimeout(() => {
      setAttempts((n) => n + 1)
      router.refresh()
    }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [attempts, router])

  const timedOut = attempts >= MAX_POLLS

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground">
      {timedOut ? (
        <>
          Still confirming your payment. This can take a minute — refresh this page shortly,
          or contact support if it doesn&apos;t update.
        </>
      ) : (
        <>Confirming your payment…</>
      )}
    </div>
  )
}
