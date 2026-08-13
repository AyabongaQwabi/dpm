'use server'

/**
 * Snapshotting the provider's requirements onto a booking, and reading them
 * back with their upload state.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  buildRequirementDefinitions,
  summariseProgress,
  type RequirementProgress,
} from '@/lib/domain/booking-requirements'

/**
 * Copy the package's current requirements onto the booking.
 *
 * Called once, at booking creation. Idempotent: if the booking already has
 * snapshot rows it does nothing, so a retried checkout cannot double-insert.
 *
 * Only the file slots become rows — the freetext `requirements` note is not a
 * thing you upload against, so it is snapshotted onto the booking's own notes
 * surface rather than becoming a fake upload row.
 */
export async function snapshotBookingRequirements(params: {
  bookingId: string
  packageId: string | null
}): Promise<number> {
  if (!params.packageId) return 0

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('booking_requirements')
    .select('id')
    .eq('booking_id', params.bookingId)
    .limit(1)

  if (existing && existing.length > 0) return 0

  const { data: pkg } = await admin
    .from('service_packages')
    .select('id, requirements, requirement_file_slots')
    .eq('id', params.packageId)
    .single()

  if (!pkg) return 0

  const { slots } = buildRequirementDefinitions({
    requirements: pkg.requirements,
    requirementFileSlots: pkg.requirement_file_slots,
  })

  if (slots.length === 0) return 0

  const { error } = await admin.from('booking_requirements').insert(
    slots.map((slot) => ({
      booking_id: params.bookingId,
      label: slot.label,
      description: slot.description,
      sort_order: slot.sortOrder,
      source_slot_index: slot.sourceSlotIndex,
      source_package_id: pkg.id,
    })),
  )

  if (error) {
    console.error('Failed to snapshot booking requirements:', error.message)
    return 0
  }

  return slots.length
}

export interface BookingRequirementFile {
  id: string
  originalFilename: string
  sizeBytes: number
  mimeType: string
  createdAt: string
  uploaderRole: string
}

export interface BookingRequirementView {
  id: string
  label: string
  description: string
  sortOrder: number
  files: BookingRequirementFile[]
}

/**
 * The requirements panel data for either dashboard. Reads
 * booking_requirements (the snapshot), never the live package.
 *
 * Uses the request-scoped anon client so RLS applies — a caller who is not a
 * party to the booking gets nothing back.
 */
export async function loadBookingRequirements(bookingId: string): Promise<{
  requirements: BookingRequirementView[]
  adHocFiles: BookingRequirementFile[]
  progress: RequirementProgress
}> {
  const supabase = await createClient()

  const [{ data: reqs }, { data: files }] = await Promise.all([
    supabase
      .from('booking_requirements')
      .select('id, label, description, sort_order')
      .eq('booking_id', bookingId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('booking_files')
      .select(
        'id, requirement_id, message_id, original_filename, size_bytes, mime_type, created_at, uploader_role',
      )
      .eq('booking_id', bookingId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  ])

  const allFiles = files ?? []

  const toView = (f: (typeof allFiles)[number]): BookingRequirementFile => ({
    id: f.id,
    originalFilename: f.original_filename,
    sizeBytes: Number(f.size_bytes),
    mimeType: f.mime_type,
    createdAt: f.created_at,
    uploaderRole: f.uploader_role,
  })

  const canonicalRequirements = new Map<
    string,
    {
      id: string
      label: string
      description: string
      sort_order: number
      duplicateIds: Set<string>
    }
  >()

  for (const r of reqs ?? []) {
    const key = `${r.sort_order}:${r.label}`
    const existing = canonicalRequirements.get(key)
    if (existing) {
      existing.duplicateIds.add(r.id)
      continue
    }

    canonicalRequirements.set(key, {
      id: r.id,
      label: r.label,
      description: r.description,
      sort_order: r.sort_order,
      duplicateIds: new Set([r.id]),
    })
  }

  const requirements: BookingRequirementView[] = [...canonicalRequirements.values()].map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    sortOrder: r.sort_order,
    files: allFiles.filter((f) => f.requirement_id && r.duplicateIds.has(f.requirement_id)).map(toView),
  }))

  // Ad-hoc = attached to the booking but not to a requirement, and not a
  // message attachment (those render in the thread instead).
  const adHocFiles = allFiles
    .filter((f) => !f.requirement_id && !f.message_id)
    .map(toView)

  const progress = summariseProgress(
    requirements.map((r) => r.id),
    requirements.filter((r) => r.files.length > 0).map((r) => r.id),
  )

  return { requirements, adHocFiles, progress }
}
