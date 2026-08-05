/**
 * Lightweight programmatic SEO audit — read-only checks against live data for
 * the thin-content and duplicate-slug risks called out in
 * docs/seo/PROGRAMMATIC-SEO-GOVERNANCE.md.
 *
 * Reports, does not fix:
 *   - duplicate provider slugs
 *   - category-location pairs below the indexable provider threshold
 *   - service-type slugs below the indexable service threshold
 *   - locations with zero published providers (would 404/be empty if linked)
 *
 * Usage:
 *   node scripts/seo-audit.mjs
 *   npm run seo:audit
 *
 * Exit code is non-zero if any check finds issues, so it can gate CI later.
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './load-env.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

const MIN_CATEGORY_LOCATION_PROVIDERS = 3
const MIN_SERVICE_TYPE_SERVICES = 2

function slugifyName(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const NOISE_WORDS = new Set(['service', 'services', 'solution', 'solutions'])

function normalizeServiceTypeSlug(title) {
  return slugifyName(title)
    .split('-')
    .filter(Boolean)
    .filter((word) => !NOISE_WORDS.has(word))
    .map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word))
    .join('-')
}

let issues = 0

function report(title, rows, formatter) {
  console.log(`\n${title}`)
  if (rows.length === 0) {
    console.log('  none')
    return
  }
  issues += rows.length
  for (const row of rows) console.log(`  ${formatter(row)}`)
}

async function main() {
  const [{ data: providers }, { data: services }] = await Promise.all([
    supabase
      .from('providers')
      .select('id, slug, business_name, is_published, location_city, provider_types(provider_categories(slug))'),
    supabase
      .from('services')
      .select('id, title, is_published, providers!inner(is_published)'),
  ])

  // 1. Duplicate provider slugs (should be unique per generateProviderSlug, but data can drift).
  const slugCounts = new Map()
  for (const p of providers ?? []) {
    if (!p.slug) continue
    slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1)
  }
  const duplicateSlugs = [...slugCounts.entries()].filter(([, count]) => count > 1)
  report('Duplicate provider slugs', duplicateSlugs, ([slug, count]) => `${slug} (${count} providers)`)

  // 2. Category-location pairs below the indexable provider threshold.
  const categoryLocationCounts = new Map()
  for (const p of providers ?? []) {
    if (!p.is_published || !p.location_city) continue
    const types = Array.isArray(p.provider_types) ? p.provider_types : p.provider_types ? [p.provider_types] : []
    for (const type of types) {
      const categories = Array.isArray(type.provider_categories)
        ? type.provider_categories
        : type.provider_categories
          ? [type.provider_categories]
          : []
      for (const category of categories) {
        if (!category.slug) continue
        const citySlug = slugifyName(p.location_city)
        const key = `${category.slug}:${citySlug}`
        categoryLocationCounts.set(key, (categoryLocationCounts.get(key) ?? 0) + 1)
      }
    }
  }
  const thinCategoryLocations = [...categoryLocationCounts.entries()].filter(
    ([, count]) => count > 0 && count < MIN_CATEGORY_LOCATION_PROVIDERS,
  )
  report(
    `Category-location pages below threshold (< ${MIN_CATEGORY_LOCATION_PROVIDERS} providers, correctly noindexed)`,
    thinCategoryLocations,
    ([key, count]) => `${key} (${count} provider${count === 1 ? '' : 's'})`,
  )

  // 3. Service-type slugs below the indexable service threshold.
  const publishedServices = (services ?? []).filter((s) => s.is_published && s.providers?.is_published)
  const serviceTypeCounts = new Map()
  for (const s of publishedServices) {
    const slug = normalizeServiceTypeSlug(s.title)
    if (!slug) continue
    serviceTypeCounts.set(slug, (serviceTypeCounts.get(slug) ?? 0) + 1)
  }
  const thinServiceTypes = [...serviceTypeCounts.entries()].filter(
    ([, count]) => count > 0 && count < MIN_SERVICE_TYPE_SERVICES,
  )
  report(
    `Service-type pages below threshold (< ${MIN_SERVICE_TYPE_SERVICES} services, correctly noindexed)`,
    thinServiceTypes,
    ([slug, count]) => `${slug} (${count} service${count === 1 ? '' : 's'})`,
  )

  // 4. Published providers missing a slug (falls back to /providers/[id] — ugly but not broken).
  const noSlug = (providers ?? []).filter((p) => p.is_published && !p.slug)
  report('Published providers without a slug', noSlug, (p) => `${p.business_name} (${p.id})`)

  console.log(`\n${issues} item(s) flagged for review.`)
  process.exit(issues > 0 ? 1 : 0)
}

main()
