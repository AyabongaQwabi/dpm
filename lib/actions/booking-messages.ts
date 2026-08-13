'use server'

/**
 * Booking-scoped message thread (Part 4).
 *
 * One thread per booking. This is separate from the pre-existing
 * message_threads/messages inbox (provider×customer×service scoped), which is
 * left untouched and still powers /customer-account/messages and
 * /provider-dashboard/messages.
 *
 * No realtime: the project has no Supabase realtime subscriptions anywhere
 * today, and adding that dependency was explicitly out of bounds without
 * flagging it. The thread polls instead — see MESSAGE_POLL_INTERVAL_MS.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveBookingParty } from '@/lib/actions/booking-files'
import { sendNewMessageEmail } from '@/lib/booking-emails'
import { MESSAGING_CLOSE_AFTER_COMPLETED_DAYS } from '@/lib/booking-lifecycle-config'
import { sanitiseMessageBody, isThreadOpen } from '@/lib/domain/booking-messages'

export interface BookingMessageView {
  id: string
  senderRole: string
  body: string
  createdAt: string
  readAt: string | null
  attachments: { id: string; originalFilename: string; sizeBytes: number }[]
}

/** Load the thread. RLS-scoped: a non-party gets an empty list. */
export async function loadBookingMessages(
  bookingId: string,
): Promise<BookingMessageView[]> {
  const supabase = await createClient()

  const [{ data: messages }, { data: files }] = await Promise.all([
    supabase
      .from('booking_messages')
      .select('id, sender_role, body, created_at, read_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
    supabase
      .from('booking_files')
      .select('id, message_id, original_filename, size_bytes')
      .eq('booking_id', bookingId)
      .not('message_id', 'is', null)
      .is('deleted_at', null),
  ])

  const attachments = files ?? []

  return (messages ?? []).map((m) => ({
    id: m.id,
    senderRole: m.sender_role,
    body: m.body,
    createdAt: m.created_at,
    readAt: m.read_at,
    attachments: attachments
      .filter((f) => f.message_id === m.id)
      .map((f) => ({
        id: f.id,
        originalFilename: f.original_filename,
        sizeBytes: Number(f.size_bytes),
      })),
  }))
}

export async function sendBookingMessage(formData: FormData): Promise<{
  ok: boolean
  error?: string
}> {
  const bookingId = formData.get('bookingId') as string
  const body = sanitiseMessageBody((formData.get('body') as string) || '')

  if (!body) return { ok: false, error: 'Message cannot be empty.' }

  const party = await resolveBookingParty(bookingId)
  if (!party) return { ok: false, error: 'You do not have access to this booking.' }

  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('status, completed_at')
    .eq('id', bookingId)
    .single()

  if (
    booking &&
    !isThreadOpen({
      status: booking.status,
      completedAt: booking.completed_at,
      closeAfterDays: MESSAGING_CLOSE_AFTER_COMPLETED_DAYS,
    })
  ) {
    return {
      ok: false,
      error: 'This conversation is closed. Contact support if you still need help.',
    }
  }

  const { error } = await admin.from('booking_messages').insert({
    booking_id: bookingId,
    sender_id: party.actorId,
    sender_role: party.role,
    body,
  })

  if (error) {
    console.error('Booking message insert failed:', error.message)
    return { ok: false, error: 'Could not send your message.' }
  }

  // Fire-and-forget, and rate-limited inside — a rapid exchange does not
  // generate one email per message.
  void sendNewMessageEmail({ bookingId, senderRole: party.role, body })

  revalidatePath(`/customer-account/bookings/${bookingId}`)
  revalidatePath(`/provider-dashboard/bookings/${bookingId}`)

  return { ok: true }
}

/** Mark the other party's messages read. Called when a booking page is opened. */
export async function markBookingMessagesRead(bookingId: string): Promise<void> {
  const party = await resolveBookingParty(bookingId)
  if (!party) return

  const admin = createAdminClient()
  await admin
    .from('booking_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .neq('sender_role', party.role)
    .is('read_at', null)
}

/**
 * Unread count for a dashboard badge — messages sent by the *other* party
 * that this viewer has not read.
 */
export async function unreadBookingMessageCount(params: {
  viewerRole: 'customer' | 'provider'
  bookingIds: string[]
}): Promise<Record<string, number>> {
  if (params.bookingIds.length === 0) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from('booking_messages')
    .select('booking_id')
    .in('booking_id', params.bookingIds)
    .neq('sender_role', params.viewerRole)
    .is('read_at', null)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.booking_id] = (counts[row.booking_id] ?? 0) + 1
  }
  return counts
}
