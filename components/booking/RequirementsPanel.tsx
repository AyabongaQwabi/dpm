'use client'

import { useState, useTransition } from 'react'
import { uploadBookingFile, removeBookingFile } from '@/lib/actions/booking-files'
import { formatFileSize } from '@/lib/domain/booking-files'
import { MAX_BOOKING_FILE_SIZE_MB } from '@/lib/booking-lifecycle-config'
import type {
  BookingRequirementView,
  BookingRequirementFile,
} from '@/lib/actions/booking-requirements'

/**
 * The requirements panel, used by both dashboards.
 *
 * mode="upload"   — customer side: upload, replace and remove.
 * mode="download" — provider side: read and download only, with a clear
 *                   outstanding indicator and the nudge action.
 *
 * Renders nothing when the booking has no requirements and no ad-hoc files.
 */
export function RequirementsPanel({
  bookingId,
  requirements,
  adHocFiles,
  progress,
  mode,
  canModify,
  nudgeAction,
  nudgeDisabledReason,
}: {
  bookingId: string
  requirements: BookingRequirementView[]
  adHocFiles: BookingRequirementFile[]
  progress: { total: number; fulfilled: number; outstanding: number }
  mode: 'upload' | 'download'
  /** False once the booking is completed — the record closes. */
  canModify: boolean
  nudgeAction?: (formData: FormData) => void
  nudgeDisabledReason?: string | null
}) {
  if (requirements.length === 0 && adHocFiles.length === 0) return null

  const hasOutstanding = progress.outstanding > 0

  return (
    <section
      className={`rounded-2xl border p-6 ${
        mode === 'upload' && hasOutstanding ? 'border-amber-300 bg-amber-50/50' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Requirements</h2>
          {progress.total > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {progress.fulfilled} of {progress.total} requirements uploaded
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(requirements.some((r) => r.files.length > 0) || adHocFiles.length > 0) && (
            <a
              href={`/api/bookings/${bookingId}/files/archive`}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Download all
            </a>
          )}
          {mode === 'download' && hasOutstanding && nudgeAction && (
            <form action={nudgeAction}>
              <input type="hidden" name="bookingId" value={bookingId} />
              <button
                type="submit"
                disabled={!!nudgeDisabledReason}
                title={nudgeDisabledReason ?? undefined}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Nudge customer
              </button>
            </form>
          )}
        </div>
      </div>

      {mode === 'download' && hasOutstanding && (
        <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Still waiting on {progress.outstanding} item
          {progress.outstanding === 1 ? '' : 's'} from the customer.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {requirements.map((requirement) => (
          <RequirementRow
            key={requirement.id}
            bookingId={bookingId}
            requirement={requirement}
            mode={mode}
            canModify={canModify}
          />
        ))}
      </ul>

      {adHocFiles.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="text-sm font-medium">Other files</p>
          <ul className="mt-2 space-y-2">
            {adHocFiles.map((file) => (
              <li key={file.id}>
                <FileRow
                  bookingId={bookingId}
                  file={file}
                  canModify={canModify && mode === 'upload'}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === 'upload' && canModify && (
        <div className="mt-5 border-t pt-4">
          <UploadControl
            bookingId={bookingId}
            requirementId={null}
            label="Add another file"
          />
        </div>
      )}
    </section>
  )
}

function RequirementRow({
  bookingId,
  requirement,
  mode,
  canModify,
}: {
  bookingId: string
  requirement: BookingRequirementView
  mode: 'upload' | 'download'
  canModify: boolean
}) {
  const uploaded = requirement.files.length > 0

  return (
    <li className="rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{requirement.label}</p>
          {requirement.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{requirement.description}</p>
          )}
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            uploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
          }`}
        >
          {uploaded ? 'Uploaded' : 'Outstanding'}
        </span>
      </div>

      {uploaded && (
        <ul className="mt-3 space-y-2">
          {requirement.files.map((file) => (
            <li key={file.id}>
              <FileRow
                bookingId={bookingId}
                file={file}
                canModify={canModify && mode === 'upload'}
              />
            </li>
          ))}
        </ul>
      )}

      {mode === 'upload' && canModify && (
        <div className="mt-3">
          <UploadControl
            bookingId={bookingId}
            requirementId={requirement.id}
            label={uploaded ? 'Upload another' : 'Upload file'}
          />
        </div>
      )}
    </li>
  )
}

function FileRow({
  bookingId,
  file,
  canModify,
}: {
  bookingId: string
  file: BookingRequirementFile
  canModify: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm">{file.originalFilename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.sizeBytes)} ·{' '}
          {new Date(file.createdAt).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {file.uploaderRole === 'provider' && ' · from provider'}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <a
          href={`/api/bookings/files/${file.id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Download
        </a>
        {canModify && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const data = new FormData()
                data.set('bookingId', bookingId)
                data.set('fileId', file.id)
                await removeBookingFile(data)
              })
            }}
            className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

function UploadControl({
  bookingId,
  requirementId,
  label,
}: {
  bookingId: string
  requirementId: string | null
  label: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputId = `upload-${requirementId ?? 'adhoc'}`

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted ${
          isPending ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {isPending ? 'Uploading…' : label}
      </label>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        disabled={isPending}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setError(null)

          // Client-side pre-check for a fast message. The server validates
          // again — that is the check that counts.
          if (file.size > MAX_BOOKING_FILE_SIZE_MB * 1024 * 1024) {
            setError(`Files must be ${MAX_BOOKING_FILE_SIZE_MB} MB or smaller.`)
            event.target.value = ''
            return
          }

          const data = new FormData()
          data.set('bookingId', bookingId)
          if (requirementId) data.set('requirementId', requirementId)
          data.set('file', file)

          startTransition(async () => {
            const result = await uploadBookingFile(data)
            if (!result.ok) setError(result.error ?? 'Upload failed.')
          })
          event.target.value = ''
        }}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Any file type, up to {MAX_BOOKING_FILE_SIZE_MB} MB.
      </p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
