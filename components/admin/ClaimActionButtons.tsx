'use client'

import { useState, useTransition } from 'react'
import { rejectClaim, forceUnclaim } from '@/lib/actions/admin-claims'

export function RejectClaimButton({ claimId }: { claimId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (!confirm('Reject this claim? The profile will return to unclaimed.')) return
    setError(null)
    startTransition(async () => {
      const result = await rejectClaim(claimId)
      if (!result.ok) setError(result.error ?? 'Could not reject claim.')
    })
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {pending ? 'Rejecting…' : 'Reject claim'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function ForceUnclaimButton({ providerId }: { providerId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (!confirm('Revert this profile to unclaimed? It will be unpublished until re-claimed.')) return
    setError(null)
    startTransition(async () => {
      const result = await forceUnclaim(providerId)
      if (!result.ok) setError(result.error ?? 'Could not update profile.')
    })
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
      >
        {pending ? 'Reverting…' : 'Revert to unclaimed'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
