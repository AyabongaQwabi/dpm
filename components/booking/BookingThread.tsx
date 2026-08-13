'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendBookingMessage } from '@/lib/actions/booking-messages'
import { formatFileSize } from '@/lib/domain/booking-files'
import { MESSAGE_POLL_INTERVAL_MS } from '@/lib/booking-lifecycle-config'
import type { BookingMessageView } from '@/lib/actions/booking-messages'

/**
 * The booking's message thread.
 *
 * Polls rather than subscribing: the project uses no Supabase realtime
 * anywhere, and adding that dependency was out of bounds for this build. The
 * tradeoff is up to MESSAGE_POLL_INTERVAL_MS of latency on an inbound message,
 * which is acceptable for a booking conversation and costs one lightweight
 * refresh per interval per open tab. Polling stops while the tab is hidden.
 */
export function BookingThread({
  bookingId,
  messages,
  viewerRole,
  isOpen,
  closedNotice,
}: {
  bookingId: string
  messages: BookingMessageView[]
  viewerRole: 'customer' | 'provider'
  isOpen: boolean
  closedNotice?: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const timer = setInterval(tick, MESSAGE_POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [router, isOpen])

  return (
    <section className="rounded-2xl border p-6">
      <h2 className="font-semibold">Messages</h2>

      {messages.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No messages yet. Anything you send here stays attached to this booking.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {messages.map((message) => {
            const mine = message.senderRole === viewerRole
            return (
              <li
                key={message.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>

                  {message.attachments.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-current/20 pt-2">
                      {message.attachments.map((file) => (
                        <li key={file.id} className="text-xs">
                          <a
                            href={`/api/bookings/files/${file.id}`}
                            className="underline underline-offset-2"
                          >
                            {file.originalFilename}
                          </a>{' '}
                          <span className="opacity-70">({formatFileSize(file.sizeBytes)})</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className={`mt-1 text-[11px] ${mine ? 'opacity-70' : 'text-muted-foreground'}`}>
                    {new Date(message.createdAt).toLocaleString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {isOpen ? (
        <form
          ref={formRef}
          className="mt-4 space-y-2"
          action={(formData) => {
            setError(null)
            startTransition(async () => {
              const result = await sendBookingMessage(formData)
              if (!result.ok) {
                setError(result.error ?? 'Could not send your message.')
              } else {
                formRef.current?.reset()
                router.refresh()
              }
            })
          }}
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <textarea
            name="body"
            rows={3}
            required
            maxLength={5000}
            placeholder="Write a message…"
            className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {closedNotice ?? 'This conversation is now closed.'}
        </p>
      )}
    </section>
  )
}
