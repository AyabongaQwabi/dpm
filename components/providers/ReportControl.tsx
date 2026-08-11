'use client'

import { useState, useTransition } from 'react'
import { reportPost } from '@/lib/actions/provider-posts'

// Public report control on posts and stories — writes to
// content_post_reports (no existing moderation mechanism found in the repo,
// so this is a new table; see the migration). No auth required to report.
export function ReportControl({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  if (status === 'sent') {
    return <p className="text-xs text-muted-foreground">Thanks — we&apos;ll take a look.</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Report
      </button>
    )
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData()
        fd.set('postId', postId)
        fd.set('reason', reason)
        startTransition(async () => {
          const result = await reportPost(fd)
          setStatus(result.ok ? 'sent' : 'error')
        })
      }}
    >
      <label className="text-xs text-muted-foreground" htmlFor={`report-reason-${postId}`}>
        Why are you reporting this?
      </label>
      <textarea
        id={`report-reason-${postId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        rows={2}
        className="rounded-md border border-input bg-card px-2 py-1 text-xs"
      />
      {status === 'error' && <p className="text-xs text-destructive">Something went wrong — try again.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !reason.trim()}
          className="rounded-md bg-muted px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Submit'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          Cancel
        </button>
      </div>
    </form>
  )
}
