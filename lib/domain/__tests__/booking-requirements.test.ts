import { describe, expect, it } from 'vitest'
import {
  buildRequirementDefinitions,
  hasAnyRequirement,
  parseFileSlots,
  summariseProgress,
} from '../booking-requirements'

describe('parseFileSlots', () => {
  it('reads the stored [{name}] shape', () => {
    expect(parseFileSlots([{ name: 'Floor plan' }, { name: 'Photos' }])).toEqual([
      { name: 'Floor plan' },
      { name: 'Photos' },
    ])
  })

  it('tolerates a bare string array', () => {
    expect(parseFileSlots(['Floor plan'])).toEqual([{ name: 'Floor plan' }])
  })

  it('drops entries with no usable name rather than rendering blanks', () => {
    expect(parseFileSlots([{ name: '' }, { name: '   ' }, {}, null, 5])).toEqual([])
  })

  it('returns nothing for a non-array value', () => {
    // The column is NOT NULL DEFAULT '[]' but carries no shape constraint.
    expect(parseFileSlots(null)).toEqual([])
    expect(parseFileSlots('nonsense')).toEqual([])
    expect(parseFileSlots({ name: 'x' })).toEqual([])
  })
})

describe('buildRequirementDefinitions', () => {
  it('treats array order as display order', () => {
    const { slots } = buildRequirementDefinitions({
      requirements: '',
      requirementFileSlots: [{ name: 'First' }, { name: 'Second' }, { name: 'Third' }],
    })

    expect(slots.map((s) => s.label)).toEqual(['First', 'Second', 'Third'])
    expect(slots.map((s) => s.sortOrder)).toEqual([0, 1, 2])
    expect(slots.map((s) => s.sourceSlotIndex)).toEqual([0, 1, 2])
  })

  it('keeps the freetext note separate from the upload slots', () => {
    const result = buildRequirementDefinitions({
      requirements: '  Bring your ID  ',
      requirementFileSlots: [{ name: 'ID copy' }],
    })

    expect(result.note).toBe('Bring your ID')
    expect(result.slots).toHaveLength(1)
  })

  it('reports nothing at all when the package defines no requirements', () => {
    const result = buildRequirementDefinitions({
      requirements: '',
      requirementFileSlots: [],
    })

    expect(result.note).toBeNull()
    expect(result.slots).toEqual([])
    // Drives "render nothing — no empty state, no 'none required' line".
    expect(hasAnyRequirement(result)).toBe(false)
  })

  it('counts a note-only package as having requirements', () => {
    const result = buildRequirementDefinitions({
      requirements: 'Just call me',
      requirementFileSlots: [],
    })
    expect(hasAnyRequirement(result)).toBe(true)
  })
})

describe('summariseProgress', () => {
  it('counts a requirement as met once any file is attached', () => {
    const progress = summariseProgress(['r1', 'r2', 'r3'], ['r1', null])
    expect(progress).toEqual({ total: 3, fulfilled: 1, outstanding: 2, complete: false })
  })

  it('allows many files against one slot without double counting', () => {
    // No multiplicity constraint: a customer may upload as many as they like.
    const progress = summariseProgress(['r1', 'r2'], ['r1', 'r1', 'r1', 'r2'])
    expect(progress.fulfilled).toBe(2)
    expect(progress.complete).toBe(true)
  })

  it('ignores ad-hoc files with no requirement', () => {
    const progress = summariseProgress(['r1'], [null, null])
    expect(progress.fulfilled).toBe(0)
    expect(progress.outstanding).toBe(1)
  })

  it('is never "complete" when there are no requirements at all', () => {
    expect(summariseProgress([], []).complete).toBe(false)
  })
})
