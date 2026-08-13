/**
 * Booking file rules: name sanitisation, storage paths, and validation.
 *
 * Pure — no DB, no framework imports (ARCH-006). Limits are passed in by the
 * caller from config/booking-lifecycle.json so nothing here is hardcoded.
 */

/** Path convention: bookings/{booking_id}/{requirement_id|ad-hoc}/{uuid}-{name}. */
export const AD_HOC_SEGMENT = 'ad-hoc'

/**
 * Reduce a user-supplied filename to something safe for a storage key while
 * keeping it recognisable to the person who uploaded it. Supabase storage keys
 * are restricted, and a raw filename can carry path traversal.
 */
export function sanitiseFilename(filename: string): string {
  // Strip any directory component first — defeats "../../etc/passwd".
  const base = filename.split(/[/\\]/).pop() || 'file'

  const cleaned = base
    .normalize('NFKD')
    // Drop anything that isn't a safe key character.
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    // Collapse runs and leading dots (no hidden files, no "..").
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 120)

  return cleaned.length > 0 ? cleaned : 'file'
}

export function buildStoragePath(params: {
  bookingId: string
  requirementId: string | null
  uuid: string
  filename: string
}): string {
  const segment = params.requirementId || AD_HOC_SEGMENT
  return `bookings/${params.bookingId}/${segment}/${params.uuid}-${sanitiseFilename(params.filename)}`
}

/** Extract the booking id from a storage path. Mirrors foldername(name)[2] in the RLS policy. */
export function bookingIdFromPath(path: string): string | null {
  const parts = path.split('/')
  if (parts.length < 4 || parts[0] !== 'bookings') return null
  return parts[1] || null
}

export type FileRejectionReason = 'empty' | 'too_large' | 'booking_quota_exceeded'

export interface FileValidationResult {
  ok: boolean
  reason?: FileRejectionReason
  message?: string
}

/**
 * Server-side validation. The client checks too, but this is the check that
 * counts.
 *
 * There is deliberately no MIME allowlist: every requirement slot accepts any
 * file type, per the product owner. Size is the only content constraint.
 */
export function validateUpload(params: {
  sizeBytes: number
  maxFileSizeBytes: number
  /** Sum of live (non-deleted) file sizes already on this booking. */
  existingBookingBytes: number
  maxBookingTotalBytes: number
}): FileValidationResult {
  if (params.sizeBytes <= 0) {
    return { ok: false, reason: 'empty', message: 'That file is empty.' }
  }

  if (params.sizeBytes > params.maxFileSizeBytes) {
    const mb = Math.round(params.maxFileSizeBytes / (1024 * 1024))
    return {
      ok: false,
      reason: 'too_large',
      message: `Files must be ${mb} MB or smaller.`,
    }
  }

  if (
    params.existingBookingBytes + params.sizeBytes >
    params.maxBookingTotalBytes
  ) {
    const mb = Math.round(params.maxBookingTotalBytes / (1024 * 1024))
    return {
      ok: false,
      reason: 'booking_quota_exceeded',
      message: `This booking has reached its ${mb} MB total upload limit.`,
    }
  }

  return { ok: true }
}

/** Human-readable file size for the requirements panel. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
