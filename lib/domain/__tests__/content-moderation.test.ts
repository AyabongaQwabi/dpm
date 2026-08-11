import { describe, it, expect } from 'vitest'
import {
  findContactDetails,
  findUnverifiableClaims,
  findCompetitorMentions,
  moderateContent,
  type ModerationWordLists,
} from '../content-moderation'

const TEST_WORD_LISTS: ModerationWordLists = {
  claimWords: ['certified', 'certification', 'licensed', 'license', 'accredited', 'accreditation', 'guaranteed', 'guarantee'],
  competitorNames: [],
  profanityWords: ['fuck', 'shit', 'bitch', 'asshole'],
}

// ---------- BLOCK: contact details ----------

describe('findContactDetails', () => {
  it('detects a South African phone number', () => {
    expect(findContactDetails('Call me on 082 123 4567')).toContain('phone number')
  })

  it('detects an email address', () => {
    expect(findContactDetails('reach me at jane@example.com')).toContain('email address')
  })

  it('detects a WhatsApp link', () => {
    expect(findContactDetails('WhatsApp me on 0821234567')).toContain('WhatsApp link')
    expect(findContactDetails('chat via wa.me/27821234567')).toContain('WhatsApp link')
  })

  it('detects an external booking link', () => {
    expect(findContactDetails('book directly at calendly.com/jane')).toContain('external booking link')
  })

  it('finds nothing in ordinary post text', () => {
    expect(findContactDetails('Finished a kitchen renovation in Cape Town this week — really happy with how it turned out.')).toEqual([])
  })
})

describe('moderateContent — contact-detail blocking on body AND title', () => {
  it('blocks when the body contains a phone number', () => {
    const result = moderateContent({ title: 'Great job today', bodyText: 'Call 082 123 4567 to book directly' }, TEST_WORD_LISTS)
    expect(result.blocked).toBe(true)
    expect(result.blockReasons).toContain('phone number')
  })

  it('blocks when the body contains an email', () => {
    const result = moderateContent({ title: 'Update', bodyText: 'Email jane@example.com for a quote' }, TEST_WORD_LISTS)
    expect(result.blocked).toBe(true)
  })

  it('blocks when the body contains a WhatsApp link', () => {
    const result = moderateContent({ title: 'Update', bodyText: 'WhatsApp me on 082 123 4567' }, TEST_WORD_LISTS)
    expect(result.blocked).toBe(true)
  })

  it('blocks when the TITLE contains a phone number, even with clean body text', () => {
    const result = moderateContent({ title: 'Call 082 123 4567 for a quote', bodyText: 'Just finished a great job.' }, TEST_WORD_LISTS)
    expect(result.blocked).toBe(true)
    expect(result.blockReasons).toContain('phone number')
  })

  it('does not block ordinary content', () => {
    const result = moderateContent({ title: 'Kitchen renovation complete', bodyText: 'Really proud of how this one turned out.' }, TEST_WORD_LISTS)
    expect(result.blocked).toBe(false)
  })
})

// ---------- FLAG: unverifiable claims ----------

describe('findUnverifiableClaims', () => {
  it('flags "certified"', () => {
    expect(findUnverifiableClaims('We are a certified electrical contractor', TEST_WORD_LISTS.claimWords)).toContain('certified')
  })

  it('flags "licensed" and "guaranteed"', () => {
    const found = findUnverifiableClaims('Fully licensed and guaranteed work', TEST_WORD_LISTS.claimWords)
    expect(found).toContain('licensed')
    expect(found).toContain('guaranteed')
  })

  it('finds nothing when no claim words are present', () => {
    expect(findUnverifiableClaims('We do great kitchen renovations', TEST_WORD_LISTS.claimWords)).toEqual([])
  })
})

describe('moderateContent — claims flag, not block', () => {
  it('flags but still publishes (blocked stays false)', () => {
    const result = moderateContent({ title: 'Certified electrician', bodyText: 'Guaranteed quality work.' }, TEST_WORD_LISTS)
    expect(result.blocked).toBe(false)
    expect(result.flagged).toBe(true)
    expect(result.flagReasons.some((r) => r.includes('certified'))).toBe(true)
  })
})

// ---------- FLAG: competitor names ----------

describe('findCompetitorMentions', () => {
  it('flags a name from the provided list', () => {
    expect(findCompetitorMentions('Better than CompetitorX', ['CompetitorX'])).toContain('CompetitorX')
  })

  it('is case-insensitive', () => {
    expect(findCompetitorMentions('better than competitorx', ['CompetitorX'])).toContain('CompetitorX')
  })

  it('finds nothing against an empty list (default — not yet populated)', () => {
    expect(findCompetitorMentions('Better than CompetitorX', [])).toEqual([])
  })
})
