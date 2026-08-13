/**
 * Requirements: reading the provider's existing definition, and snapshotting
 * it onto a booking.
 *
 * The source shape is deliberately NOT migrated. A service package carries:
 *   requirements            TEXT   — freetext, "what I need from you"
 *   requirement_file_slots  JSONB  — [{ name: string }], name only
 *
 * There is no required/optional flag, no accepted-file-type list, no
 * multiplicity constraint and no explicit sort column, and per the product
 * owner none of those are to be invented here. So:
 *   * every slot accepts ANY file type,
 *   * a customer may upload ANY number of files against a slot,
 *   * array order IS display order,
 *   * every slot is treated as expected-but-not-blocking; nothing in this
 *     build refuses a transition because a file is missing. The provider is
 *     shown what is outstanding and can nudge.
 *
 * Pure — no DB, no framework imports (ARCH-006).
 */

/** A file slot as stored in service_packages.requirement_file_slots. */
export interface RequirementFileSlot {
  name: string
}

/** A requirement ready to render or snapshot. */
export interface RequirementDefinition {
  label: string
  description: string
  sortOrder: number
  /** Index in the source requirement_file_slots array; null for the freetext row. */
  sourceSlotIndex: number | null
}

/**
 * Parse the JSONB column defensively. It is `NOT NULL DEFAULT '[]'` but has no
 * shape constraint, so anything could be in there. Entries without a usable
 * name are dropped rather than rendered as blanks.
 */
export function parseFileSlots(raw: unknown): RequirementFileSlot[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { name: entry.trim() }
      if (entry && typeof entry === 'object' && 'name' in entry) {
        const name = (entry as { name: unknown }).name
        return typeof name === 'string' ? { name: name.trim() } : null
      }
      return null
    })
    .filter((slot): slot is RequirementFileSlot => !!slot && slot.name.length > 0)
}

/**
 * Build the requirement list for a package.
 *
 * The freetext `requirements` field is not a file slot — it is a note about
 * what the provider needs. It is returned separately so callers can render it
 * as prose rather than as an upload row.
 */
export function buildRequirementDefinitions(params: {
  requirements: string | null | undefined
  requirementFileSlots: unknown
}): {
  note: string | null
  slots: RequirementDefinition[]
} {
  const note = (params.requirements || '').trim() || null

  const slots = parseFileSlots(params.requirementFileSlots).map((slot, index) => ({
    label: slot.name,
    description: '',
    sortOrder: index,
    sourceSlotIndex: index,
  }))

  return { note, slots }
}

/** True when the service has nothing to show — render nothing at all, no empty state. */
export function hasAnyRequirement(input: {
  note: string | null
  slots: RequirementDefinition[]
}): boolean {
  return input.note !== null || input.slots.length > 0
}

/** Progress summary for the "3 of 5 requirements uploaded" surface. */
export interface RequirementProgress {
  total: number
  fulfilled: number
  outstanding: number
  /** True when there is nothing left for the customer to upload. */
  complete: boolean
}

export function summariseProgress(
  requirementIds: string[],
  fileRequirementIds: (string | null)[],
): RequirementProgress {
  const filled = new Set(fileRequirementIds.filter((id): id is string => !!id))
  const fulfilled = requirementIds.filter((id) => filled.has(id)).length

  return {
    total: requirementIds.length,
    fulfilled,
    outstanding: requirementIds.length - fulfilled,
    complete: requirementIds.length > 0 && fulfilled === requirementIds.length,
  }
}
