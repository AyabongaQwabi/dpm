// Pure helpers for normalizing provider-entered service titles into a
// canonical service-type slug — no framework imports.
import { slugifyName } from './slug'

// Trailing/standalone words that don't change the service type — stripped so
// "Logo Design", "logo design service", and "logo designs" collapse to one slug.
const NOISE_WORDS = new Set(['service', 'services', 'solution', 'solutions'])

/**
 * Normalize a provider-entered service title into a canonical slug for
 * grouping on /providers/service/[slug] pages. Strips generic noise words
 * and trailing plurals so near-duplicate titles consolidate to one page.
 */
export function normalizeServiceTypeSlug(title: string): string {
  const words = slugifyName(title)
    .split('-')
    .filter(Boolean)
    .filter((word) => !NOISE_WORDS.has(word))
    .map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word))

  return words.join('-')
}
