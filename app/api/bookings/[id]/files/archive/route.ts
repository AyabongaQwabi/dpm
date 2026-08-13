import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveBookingParty } from '@/lib/actions/booking-files'
import { recordBookingEvent } from '@/lib/actions/booking-transitions'
import { createZip, type ZipEntry } from '@/lib/domain/zip'
import { BOOKING_FILES_BUCKET } from '@/lib/booking-lifecycle-config'

/**
 * Download every live file on a booking as one zip.
 *
 * Same authorisation rule as the single-file route: parties only. Files are
 * streamed out of private storage server-side, so no storage path or signed
 * URL ever reaches the client.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookingId } = await params

  const party = await resolveBookingParty(bookingId)
  if (!party) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: files } = await admin
    .from('booking_files')
    .select('id, storage_path, original_filename')
    .eq('booking_id', bookingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files on this booking' }, { status: 404 })
  }

  const entries: ZipEntry[] = []

  for (const file of files) {
    const { data, error } = await admin.storage
      .from(BOOKING_FILES_BUCKET)
      .download(file.storage_path)

    if (error || !data) {
      // One unreadable object should not fail the whole archive.
      console.error('Skipping unreadable booking file:', file.storage_path, error?.message)
      continue
    }

    entries.push({
      name: file.original_filename,
      data: new Uint8Array(await data.arrayBuffer()),
    })
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No readable files' }, { status: 404 })
  }

  const zip = createZip(entries)

  await recordBookingEvent({
    bookingId,
    eventType: 'files_downloaded_archive',
    actorType: party.role,
    actorId: party.actorId,
    note: `${entries.length} file(s) downloaded as archive`,
  })

  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="booking-${bookingId.slice(0, 8)}-files.zip"`,
      'Content-Length': String(zip.length),
      'Cache-Control': 'no-store',
    },
  })
}
