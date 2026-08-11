// Pure content moderation checks — no DB/framework imports.
//
// Two enforcement tiers per spec:
//   BLOCK — contact details (the single most important check: a post reading
//   "WhatsApp me on 082…" is a direct hole in commission on completed work).
//   FLAG — unverifiable claims, competitor names, profanity/spam. Publishes,
//   but sets moderation_status = 'flagged' for later admin review.
//
// Word lists (claim words, competitor names, profanity) are business/policy
// content, not structural code — they're passed in as parameters with
// defaults, and the real defaults live in config/content-moderation.json
// (loaded by lib/content-moderation-config.ts) so ops/legal can edit them
// without touching this file. This file stays pure and importable from
// tests with only relative imports (no @/ alias — see lib/domain/pro-membership.ts
// for why that matters for Vitest).

export interface ModerationResult {
  blocked: boolean
  blockReasons: string[]
  flagged: boolean
  flagReasons: string[]
}

// ---- BLOCK: contact details ----
// Checked against both title and body plain text.

const PHONE_PATTERN = /(?:\+27|0)[\s.-]?\(?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const WHATSAPP_PATTERN = /(wa\.me\/|whatsapp\.com\/|whatsapp\s*(me|us)?\s*[:\-]?\s*(on|at)?\s*(\+?\d))/gi
const EXTERNAL_BOOKING_PATTERN = /\b(calendly\.com|book(?:ing)?\.(?:me|com)|linktr\.ee|typeform\.com)\/\S+/gi

export function findContactDetails(text: string): string[] {
  const found: string[] = []
  if (PHONE_PATTERN.test(text)) found.push('phone number')
  if (EMAIL_PATTERN.test(text)) found.push('email address')
  if (WHATSAPP_PATTERN.test(text)) found.push('WhatsApp link')
  if (EXTERNAL_BOOKING_PATTERN.test(text)) found.push('external booking link')
  // Reset lastIndex on the global-flag regexes — .test() advances it, and
  // these functions may be called again against the next post.
  PHONE_PATTERN.lastIndex = 0
  EMAIL_PATTERN.lastIndex = 0
  WHATSAPP_PATTERN.lastIndex = 0
  EXTERNAL_BOOKING_PATTERN.lastIndex = 0
  return [...new Set(found)]
}

// ---- FLAG: unverifiable claims ----
// Sits next to the verification system — a provider claiming certification
// in a post while holding no certification badge undermines the whole ladder.
// Default word list lives in config/content-moderation.json.

export function findUnverifiableClaims(text: string, claimWords: readonly string[]): string[] {
  const lower = text.toLowerCase()
  return claimWords.filter((word) => lower.includes(word))
}

// ---- FLAG: competitor names ----
// Never allowed in ServicePros copy, provider-authored or not. Default list
// lives in config/content-moderation.json — empty until populated there.

export function findCompetitorMentions(text: string, competitorNames: readonly string[]): string[] {
  const lower = text.toLowerCase()
  return competitorNames.filter((name) => lower.includes(name.toLowerCase()))
}

// ---- FLAG: profanity/spam (baseline) ----
// Default word list lives in config/content-moderation.json. A dedicated
// profanity-filter package was not added without asking, per "no new
// dependencies without asking" — this is a baseline, not a claim of completeness.
const SPAM_PATTERNS = [/\b(click here|buy now|limited time offer|act now)\b/gi, /(.)\1{6,}/g] // repeated-char spam

export function findProfanityOrSpam(text: string, profanityWords: readonly string[]): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  if (profanityWords.some((w) => lower.includes(w))) found.push('profanity')
  if (SPAM_PATTERNS.some((p) => p.test(text))) found.push('spam pattern')
  SPAM_PATTERNS.forEach((p) => (p.lastIndex = 0))
  return found
}

export interface ModerationWordLists {
  claimWords: readonly string[]
  competitorNames: readonly string[]
  profanityWords: readonly string[]
}

/**
 * Runs all checks against a post's title + body plain text. Contact details
 * block publish entirely; everything else flags for review but still
 * publishes. Title is checked because contact details in a title bypass
 * body-only scanning otherwise (per acceptance criteria: "Contact-detail
 * blocking works on body and title").
 */
export function moderateContent(
  input: { title: string | null; bodyText: string },
  wordLists: ModerationWordLists,
): ModerationResult {
  const combined = `${input.title ?? ''} ${input.bodyText}`

  const contactDetails = findContactDetails(combined)
  const claims = findUnverifiableClaims(combined, wordLists.claimWords)
  const competitors = findCompetitorMentions(combined, wordLists.competitorNames)
  const profanitySpam = findProfanityOrSpam(combined, wordLists.profanityWords)

  const flagReasons = [
    ...claims.map((c) => `unverifiable claim: "${c}"`),
    ...competitors.map((c) => `competitor mention: "${c}"`),
    ...profanitySpam,
  ]

  return {
    blocked: contactDetails.length > 0,
    blockReasons: contactDetails,
    flagged: flagReasons.length > 0,
    flagReasons,
  }
}

/**
 * Compose-time copy for a block — helpful, not punitive, per spec: "contact
 * details belong on the profile, where customers get them through a booking."
 */
export function blockMessage(reasons: string[]): string {
  const list = reasons.join(', ')
  return `We couldn't publish this — it looks like it contains a ${list}. Contact details belong on your profile, where customers reach you through a booking. Remove it and you're good to go.`
}
