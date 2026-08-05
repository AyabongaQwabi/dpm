'use client'

import { useState } from 'react'

interface Props {
  message: string
}

/** Popup shown when the user attempts a paused action (see config/feature-pauses.json). */
export function PausedFeatureNotice({ message }: Props) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null)
  const open = dismissedMessage !== message

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">Temporarily unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => setDismissedMessage(message)}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          OK
        </button>
      </div>
    </div>
  )
}
