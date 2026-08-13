import { describe, expect, it } from 'vitest'
import { isThreadOpen, nudgeHoursRemaining, sanitiseMessageBody } from '../booking-messages'

describe('sanitiseMessageBody', () => {
  it('strips markup so no rendering surface has to trust the stored value', () => {
    expect(sanitiseMessageBody('<script>alert(1)</script>hello')).toBe('alert(1)hello')
    expect(sanitiseMessageBody('<b>bold</b>')).toBe('bold')
    expect(sanitiseMessageBody('<img src=x onerror=y>')).toBe('')
  })

  it('trims and caps very long messages', () => {
    expect(sanitiseMessageBody('   hi   ')).toBe('hi')
    expect(sanitiseMessageBody('a'.repeat(6000)).length).toBe(5000)
  })

  it('leaves ordinary punctuation and newlines intact', () => {
    expect(sanitiseMessageBody('Hi — can we meet at 3pm?\nThanks!')).toBe(
      'Hi — can we meet at 3pm?\nThanks!',
    )
  })
})

describe('isThreadOpen', () => {
  it('keeps the thread open for any booking that is not completed', () => {
    for (const status of ['requested', 'accepted', 'in_progress', 'disputed']) {
      expect(isThreadOpen({ status, completedAt: null, closeAfterDays: 30 })).toBe(true)
    }
  })

  it('stays open inside the window after completion', () => {
    expect(
      isThreadOpen({
        status: 'completed',
        completedAt: '2026-08-01T00:00:00Z',
        closeAfterDays: 30,
        now: new Date('2026-08-20T00:00:00Z'),
      }),
    ).toBe(true)
  })

  it('goes read-only once the window has passed', () => {
    expect(
      isThreadOpen({
        status: 'completed',
        completedAt: '2026-08-01T00:00:00Z',
        closeAfterDays: 30,
        now: new Date('2026-09-05T00:00:00Z'),
      }),
    ).toBe(false)
  })

  it('stays open when a completed booking has no timestamp to measure from', () => {
    expect(
      isThreadOpen({ status: 'completed', completedAt: null, closeAfterDays: 30 }),
    ).toBe(true)
  })
})

describe('nudgeHoursRemaining', () => {
  it('allows the first nudge immediately', () => {
    expect(nudgeHoursRemaining({ lastNudgeAt: null, rateLimitHours: 24, now: new Date() })).toBe(0)
  })

  it('reports the hours left inside the cooldown', () => {
    expect(
      nudgeHoursRemaining({
        lastNudgeAt: '2026-08-01T00:00:00Z',
        rateLimitHours: 24,
        now: new Date('2026-08-01T10:00:00Z'),
      }),
    ).toBe(14)
  })

  it('allows another nudge once the cooldown elapses', () => {
    expect(
      nudgeHoursRemaining({
        lastNudgeAt: '2026-08-01T00:00:00Z',
        rateLimitHours: 24,
        now: new Date('2026-08-02T00:00:01Z'),
      }),
    ).toBe(0)
  })
})
