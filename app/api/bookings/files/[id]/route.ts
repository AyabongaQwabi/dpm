import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveBookingParty } from '@/lib/actions/booking-files'
import { recordBookingEvent } from '@/lib/actions/booking-transitions'
import {
  BOOKING_FILES_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from '@/lib/booking-lifecycle-config'

/**
 * Download one booking file.
 *
 * The storage path is never exposed to the client: the client only ever knows
 * the booking_files row id. This route checks the requester is a party to the
 * booking, mints a short-lived signed URL, logs the download to the booking
 * timeline as a non-status event, and redirects.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const admin = createAdminClient()
  const { data: file } = await admin
    .from('booking_files')
    .select('id, booking_id, storage_path, original_filename, deleted_at')
    .eq('id', id)
    .maybeSingle()

  if (!file || file.deleted_at) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const party = await resolveBookingParty(file.booking_id)
  if (!party) {
    // Same response whether the booking is missing or simply not theirs.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: signed, error } = await admin.storage
    .from(BOOKING_FILES_BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: file.original_filename,
    })

  if (error || !signed?.signedUrl) {
    console.error('Signed URL generation failed:', error?.message)
    return NextResponse.json({ error: 'Could not prepare download' }, { status: 500 })
  }

  // A record of when the provider actually collected the files.
  await recordBookingEvent({
    bookingId: file.booking_id,
    eventType: 'file_downloaded',
    actorType: party.role,
    actorId: party.actorId,
    note: file.original_filename,
  })

  return NextResponse.redirect(signed.signedUrl)
}
