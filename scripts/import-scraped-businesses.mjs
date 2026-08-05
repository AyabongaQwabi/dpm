/**
 * Imports scraped-businesses.json (produced by scrape-businesses.mjs) into the
 * providers table. Equivalent to running scripts/output/scraped-import.sql in
 * the Supabase SQL editor, but done via the JS client in batches with logging.
 *
 * Each row is inserted as unclaimed/published/is_scraped, matched to its
 * provider_type by (category slug, type slug). Rows whose slug already exists
 * are skipped (ON CONFLICT (slug) DO NOTHING equivalent).
 *
 * Usage:
 *   node scripts/import-scraped-businesses.mjs
 *   npm run scrape:import
 *
 * Flags:
 *   --file=path     Input JSON (default: scripts/output/scraped-businesses.json)
 *   --limit=N       Only import the first N rows
 *   --dry-run       Resolve everything but skip the actual insert
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './load-env.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const fileArg = args.find((a) => a.startsWith('--file='))
const INPUT_PATH = fileArg
  ? fileArg.split('=')[1]
  : join(process.cwd(), 'scripts/output/scraped-businesses.json')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity

const BATCH_SIZE = 100

const startedAt = Date.now()
function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
}
const log = {
  info: (msg) => console.log(`[${elapsed()}] ${msg}`),
  warn: (msg) => console.warn(`[${elapsed()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${elapsed()}] ERROR ${msg}`),
}

async function loadProviderTypeMap() {
  const { data, error } = await supabase
    .from('provider_types')
    .select('id, slug, category_id, provider_categories!inner(slug)')

  if (error) throw new Error(`Failed to load provider_types: ${error.message}`)

  const map = new Map()
  for (const row of data) {
    const categorySlug = Array.isArray(row.provider_categories)
      ? row.provider_categories[0]?.slug
      : row.provider_categories?.slug
    if (!categorySlug) continue
    map.set(`${categorySlug}::${row.slug}`, row.id)
  }
  return map
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  log.info(`Reading ${INPUT_PATH}`)
  const raw = readFileSync(INPUT_PATH, 'utf8')
  const businesses = JSON.parse(raw)
  const rows = businesses.slice(0, LIMIT)
  log.info(`Loaded ${businesses.length} businesses (processing ${rows.length})`)

  log.info('Loading provider_types/provider_categories map...')
  const typeMap = await loadProviderTypeMap()
  log.info(`Loaded ${typeMap.size} (category, type) combinations`)

  const unresolved = new Map()
  const resolvedRows = []

  for (const b of rows) {
    const key = `${b.category}::${b.type}`
    const providerTypeId = typeMap.get(key)
    if (!providerTypeId) {
      unresolved.set(key, (unresolved.get(key) ?? 0) + 1)
      continue
    }
    resolvedRows.push({
      provider_type_id: providerTypeId,
      business_name: b.business_name,
      slug: b.slug,
      phone: b.phone ?? null,
      website: b.website ?? null,
      address: b.address ?? null,
      location_city: b.location_city ?? null,
      location_state: b.location_state ?? null,
      bio: b.bio ?? null,
      is_scraped: true,
      scraped_at: new Date().toISOString(),
      claim_status: 'unclaimed',
      is_published: true,
      onboarding_step: 999,
    })
  }

  if (unresolved.size > 0) {
    log.warn(`${[...unresolved.values()].reduce((a, b) => a + b, 0)} rows skipped — unknown (category, type):`)
    for (const [key, count] of unresolved) log.warn(`  - ${key}: ${count} row(s)`)
  }

  log.info(`Resolved ${resolvedRows.length} rows ready to import`)

  if (DRY_RUN) {
    log.info('[dry-run] Skipping insert.')
    return
  }

  const batches = chunk(resolvedRows, BATCH_SIZE)
  let inserted = 0
  let skippedExisting = 0
  let failedBatches = 0

  for (const [i, batch] of batches.entries()) {
    const { data, error } = await supabase
      .from('providers')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true })
      .select('id')

    if (error) {
      log.error(`Batch ${i + 1}/${batches.length} failed: ${error.message}`)
      failedBatches++
      continue
    }

    const insertedInBatch = data?.length ?? 0
    inserted += insertedInBatch
    skippedExisting += batch.length - insertedInBatch
    log.info(`Batch ${i + 1}/${batches.length}: inserted ${insertedInBatch}/${batch.length} (running total: ${inserted})`)
  }

  log.info('----------------------------------------')
  log.info(`Done in ${elapsed()}`)
  log.info(`Inserted:          ${inserted}`)
  log.info(`Skipped (existing slug or already present): ${skippedExisting}`)
  if (failedBatches > 0) log.error(`Failed batches:    ${failedBatches}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
