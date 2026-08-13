'use server'

/**
 * Upload, replace and soft-delete for the booking file exchange.
 *
 * Authorisation is done here, server-side, on every call: the acting session
 * must be either the booking's customer or the booking's provider. Storage RLS
 * (see the booking-files bucket policies) is the second line of defence, not
 * the first — writes go through the service-role client per project
 * convention.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildStoragePath,
  validateUpload,
  type FileValidationResult,
} from '@/lib/domain/booking-files'
import {
  BOOKING_FILES_BUCKET,
  MAX_BOOKING_FILE_SIZE_BYTES,
  MAX_BOOKING_TOTAL_BYTES,
} from '@/lib/booking-lifecycle-config'
import { recordBookingEvent } from '@/lib/actions/booking-transitions'
import { sendAllRequirementsReceivedIfComplete } from '@/lib/booking-emails'

export interface BookingParty {
  role: 'customer' | 'provider'
  /** The customers.id or providers.id of the acting party. */
  actorId: string
  bookingId: string
  status: string
}

/**
 * Resolve the caller's relationship to a booking, or null if they are not a
 * party to it. Every file and message entry point calls this first.
 */
export async function resolveBookingParty(
  bookingId: string,
): Promise<BookingParty | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('id, status, customer_id, provider_id')
    .eq('id', bookingId)
    .single()

  if (!booking) return null

  // Both tables use auth_provider_id — a naming quirk of this schema, not a bug.
  const [{ data: customer }, { data: provider }] = await Promise.all([
    admin.from('customers').select('id').eq('auth_provider_id', user.id).maybeSingle(),
    admin.from('providers').select('id').eq('auth_provider_id', user.id).maybeSingle(),
  ])

  if (customer && customer.id === booking.customer_id) {
    return { role: 'customer', actorId: customer.id, bookingId, status: booking.status }
  }
  if (provider && provider.id === booking.provider_id) {
    return { role: 'provider', actorId: provider.id, bookingId, status: booking.status }
  }

  return null
}

export interface UploadResult {
  ok: boolean
  error?: string
}

/**
 * Upload one file against a requirement (or ad-hoc when requirementId is null).
 *
 * Validation is server-side: size against config, and the requirement must
 * belong to this booking. There is deliberately no MIME allowlist — every
 * slot accepts any file type per the product owner.
 */
export async function uploadBookingFile(formData: FormData): Promise<UploadResult> {
  const bookingId = formData.get('bookingId') as string
  const rawRequirementId = (formData.get('requirementId') as string | null) || null
  const file = formData.get('file') as File | null

  if (!bookingId || !file || typeof file === 'string') {
    return { ok: false, error: 'No file supplied.' }
  }

  const party = await resolveBookingParty(bookingId)
  if (!party) return { ok: false, error: 'You do not have access to this booking.' }

  // Files are exchanged while the booking is live. Once completed, the record
  // is closed for new uploads.
  if (party.status === 'completed') {
    return { ok: false, error: 'This booking is complete and no longer accepts uploads.' }
  }

  const admin = createAdminClient()

  // The requirement must belong to THIS booking — prevents writing a file
  // against another booking's requirement id.
  let requirementId: string | null = null
  if (rawRequirementId) {
    const { data: req } = await admin
      .from('booking_requirements')
      .select('id')
      .eq('id', rawRequirementId)
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (!req) return { ok: false, error: 'Unknown requirement for this booking.' }
    requirementId = req.id
  }

  // Current live total, for the per-booking quota.
  const { data: existing } = await admin
    .from('booking_files')
    .select('size_bytes')
    .eq('booking_id', bookingId)
    .is('deleted_at', null)

  const existingBytes = (existing ?? []).reduce(
    (sum, row) => sum + Number(row.size_bytes),
    0,
  )

  const validation: FileValidationResult = validateUpload({
    sizeBytes: file.size,
    maxFileSizeBytes: MAX_BOOKING_FILE_SIZE_BYTES,
    existingBookingBytes: existingBytes,
    maxBookingTotalBytes: MAX_BOOKING_TOTAL_BYTES,
  })

  if (!validation.ok) return { ok: false, error: validation.message }

  const storagePath = buildStoragePath({
    bookingId,
    requirementId,
    uuid: crypto.randomUUID(),
    filename: file.name,
  })

  const { error: uploadError } = await admin.storage
    .from(BOOKING_FILES_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    console.error('Booking file upload failed:', uploadError.message)
    return { ok: false, error: 'Upload failed. Please try again.' }
  }

  const { error: insertError } = await admin.from('booking_files').insert({
    booking_id: bookingId,
    requirement_id: requirementId,
    uploaded_by: party.actorId,
    uploader_role: party.role,
    storage_path: storagePath,
    original_filename: file.name.slice(0, 255),
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  })

  if (insertError) {
    // Roll the object back so we never leave an orphan in the bucket.
    await admin.storage.from(BOOKING_FILES_BUCKET).remove([storagePath])
    console.error('Booking file row insert failed:', insertError.message)
    return { ok: false, error: 'Upload failed. Please try again.' }
  }

  await recordBookingEvent({
    bookingId,
    eventType: 'file_uploaded',
    actorType: party.role,
    actorId: party.actorId,
    note: file.name,
  })

  // Tell the provider only on the upload that clears the last outstanding item.
  if (party.role === 'customer') {
    void sendAllRequirementsReceivedIfComplete(bookingId)
  }

  revalidateBoth(bookingId)
  return { ok: true }
}

/**
 * Soft-delete. The storage object stays until a cleanup job removes it —
 * never deleted inline, so an accidental removal is recoverable.
 */
export async function removeBookingFile(formData: FormData): Promise<UploadResult> {
  const bookingId = formData.get('bookingId') as string
  const fileId = formData.get('fileId') as string

  const party = await resolveBookingParty(bookingId)
  if (!party) return { ok: false, error: 'You do not have access to this booking.' }
  if (party.status === 'completed') {
    return { ok: false, error: 'This booking is complete and can no longer be changed.' }
  }

  const admin = createAdminClient()

  // You may only remove your own upload.
  const { data: file } = await admin
    .from('booking_files')
    .select('id, original_filename, uploaded_by')
    .eq('id', fileId)
    .eq('booking_id', bookingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!file) return { ok: false, error: 'File not found.' }
  if (file.uploaded_by !== party.actorId) {
    return { ok: false, error: 'You can only remove files you uploaded.' }
  }

  await admin
    .from('booking_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)

  await recordBookingEvent({
    bookingId,
    eventType: 'file_removed',
    actorType: party.role,
    actorId: party.actorId,
    note: file.original_filename,
  })

  revalidateBoth(bookingId)
  return { ok: true }
}

function revalidateBoth(bookingId: string) {
  revalidatePath(`/customer-account/bookings/${bookingId}`)
  revalidatePath(`/provider-dashboard/bookings/${bookingId}`)
}
