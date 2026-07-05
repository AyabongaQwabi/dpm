// Pure slug helpers for provider URLs — no framework imports.

const GENERIC_SLUG_SUFFIXES = new Set([
  'cleaning',
  'services',
  'service',
  'company',
  'business',
  'solutions',
  'group',
  'pty',
  'ltd',
])

export function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function slugifyCity(city: string | null | undefined): string {
  if (!city?.trim()) return ''
  return slugifyName(city)
}

function isGenericSlug(slug: string): boolean {
  const parts = slug.split('-').filter(Boolean)
  if (parts.length <= 1) return true
  const last = parts[parts.length - 1]
  return GENERIC_SLUG_SUFFIXES.has(last) || parts.length <= 2
}

export interface GenerateProviderSlugInput {
  businessName: string
  city?: string | null
  existingSlugs?: Iterable<string>
}

/**
 * Build a unique provider slug from business name and optional city.
 * Appends city when the base slug is generic or collides with existing slugs.
 */
export function generateProviderSlug({
  businessName,
  city,
  existingSlugs = [],
}: GenerateProviderSlugInput): string {
  const base = slugifyName(businessName.trim())
  if (!base) return slugifyCity(city) || 'provider'

  const taken = new Set(existingSlugs)
  const cityPart = slugifyCity(city)

  let candidate = base
  if (cityPart && (isGenericSlug(base) || taken.has(base))) {
    candidate = `${base}-${cityPart}`
  }

  if (!taken.has(candidate)) return candidate

  if (cityPart && !candidate.endsWith(`-${cityPart}`)) {
    const withCity = `${base}-${cityPart}`
    if (!taken.has(withCity)) return withCity
    candidate = withCity
  }

  let n = 2
  while (taken.has(`${candidate}-${n}`)) n++
  return `${candidate}-${n}`
}
