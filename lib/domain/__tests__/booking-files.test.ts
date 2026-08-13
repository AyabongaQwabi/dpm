import { describe, expect, it } from 'vitest'
import {
  AD_HOC_SEGMENT,
  bookingIdFromPath,
  buildStoragePath,
  formatFileSize,
  sanitiseFilename,
  validateUpload,
} from '../booking-files'
// Relative, not aliased: there is no vitest config in this project, so the
// '@/' path alias is not resolved in tests.
import bookingLifecycle from '../../../config/booking-lifecycle.json'

const MAX_BOOKING_FILE_SIZE_MB = bookingLifecycle.files.maxFileSizeMb

const MB = 1024 * 1024

describe('sanitiseFilename', () => {
  it('keeps an ordinary filename readable', () => {
    expect(sanitiseFilename('site-plan v2.pdf')).toBe('site-plan-v2.pdf')
  })

  it('strips directory components so a path cannot traverse', () => {
    expect(sanitiseFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitiseFilename('/absolute/path/file.txt')).toBe('file.txt')
    expect(sanitiseFilename('..\\..\\windows\\system32')).toBe('system32')
  })

  it('never returns a leading dot or an empty name', () => {
    expect(sanitiseFilename('...')).toBe('file')
    expect(sanitiseFilename('')).toBe('file')
    expect(sanitiseFilename('.hidden')).toBe('hidden')
  })

  it('replaces characters that are unsafe in a storage key', () => {
    expect(sanitiseFilename('a b?c*d.png')).toBe('a-b-c-d.png')
  })

  it('caps very long names', () => {
    expect(sanitiseFilename(`${'a'.repeat(400)}.pdf`).length).toBeLessThanOrEqual(120)
  })
})

describe('buildStoragePath', () => {
  it('follows bookings/{booking}/{requirement}/{uuid}-{name}', () => {
    expect(
      buildStoragePath({
        bookingId: 'bk-1',
        requirementId: 'req-1',
        uuid: 'uuid-1',
        filename: 'plan.pdf',
      }),
    ).toBe('bookings/bk-1/req-1/uuid-1-plan.pdf')
  })

  it('uses the ad-hoc segment when there is no requirement', () => {
    expect(
      buildStoragePath({ bookingId: 'bk-1', requirementId: null, uuid: 'u', filename: 'x.png' }),
    ).toBe(`bookings/bk-1/${AD_HOC_SEGMENT}/u-x.png`)
  })

  it('round-trips the booking id, matching the storage RLS folder index', () => {
    const path = buildStoragePath({
      bookingId: 'bk-42',
      requirementId: 'req',
      uuid: 'u',
      filename: 'f.txt',
    })
    expect(bookingIdFromPath(path)).toBe('bk-42')
  })

  it('rejects a path that is not in the bookings namespace', () => {
    expect(bookingIdFromPath('other/bk-1/req/file.txt')).toBeNull()
    expect(bookingIdFromPath('bookings/bk-1')).toBeNull()
  })
})

describe('validateUpload', () => {
  const base = {
    maxFileSizeBytes: 20 * MB,
    existingBookingBytes: 0,
    maxBookingTotalBytes: 500 * MB,
  }

  it('accepts a normal file', () => {
    expect(validateUpload({ ...base, sizeBytes: 5 * MB }).ok).toBe(true)
  })

  it('rejects an empty file', () => {
    const result = validateUpload({ ...base, sizeBytes: 0 })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('empty')
  })

  it('rejects a file over the per-file limit', () => {
    const result = validateUpload({ ...base, sizeBytes: 20 * MB + 1 })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('too_large')
    expect(result.message).toContain('20 MB')
  })

  it('accepts a file exactly on the limit', () => {
    expect(validateUpload({ ...base, sizeBytes: 20 * MB }).ok).toBe(true)
  })

  it('rejects an upload that would exceed the per-booking quota', () => {
    const result = validateUpload({
      ...base,
      sizeBytes: 10 * MB,
      existingBookingBytes: 495 * MB,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('booking_quota_exceeded')
  })

  it('accepts any file type — no MIME allowlist by design', () => {
    // Size is the only content constraint; every requirement slot accepts
    // anything, so there is no type to reject.
    expect(validateUpload({ ...base, sizeBytes: 1 }).ok).toBe(true)
  })

  it('uses the configured 20 MB per-file limit, not a hardcoded one', () => {
    expect(MAX_BOOKING_FILE_SIZE_MB).toBe(20)
  })
})

describe('formatFileSize', () => {
  it('formats across the unit boundaries', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(5 * MB)).toBe('5.0 MB')
  })
})
