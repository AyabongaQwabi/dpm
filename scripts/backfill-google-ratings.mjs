/**
 * Backfills providers.google_rating / google_rating_count / google_place_id /
 * verified_google from scripts/output/scraped-businesses.json — the Google
 * Places data the scraper already fetched but never imported into the DB.
 *
 * verified_google is set whenever a row has a place_id — Google Places has
 * confirmed the business is real and listed, distinct from and weaker than
 * the platform's own contact/CIPC/FICA verification (see
 * supabase/migrations/20260805100000_google_verification.sql).
 *
 * Matches rows by slug. Does not touch the `reviews` table — Google ratings
 * are a display-only summary, deliberately kept separate from booking-linked
 * platform reviews so the two are never conflated (see
 * supabase/migrations/20260805000000_google_rating.sql).
 *
 * Usage:
 *   node scripts/backfill-google-ratings.mjs
 *   npm run ratings:backfill
 *
 * Flags:
 *   --file=path   Input JSON (default: scripts/output/scraped-businesses.json)
 *   --limit=N     Only process the first N matched rows
 *   --dry-run     Resolve everything but skip the actual write
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

const BATCH_SIZE = 25

const startedAt = Date.now()
function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
}
const log = {
  info: (msg) => console.log(`[${elapsed()}] ${msg}`),
  warn: (msg) => console.warn(`[${elapsed()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${elapsed()}] ERROR ${msg}`),
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  log.info(`Starting Google rating backfill (dry-run=${DRY_RUN}, limit=${LIMIT === Infinity ? 'none' : LIMIT})`)
  log.info(`Reading ${INPUT_PATH}`)

  const raw = readFileSync(INPUT_PATH, 'utf8')
  const businesses = JSON.parse(raw)
  const withRating = businesses.filter((b) => b.slug && b.rating != null)
  log.info(`Loaded ${businesses.length} businesses (${withRating.length} have a rating + slug)`)

  const rows = withRating.slice(0, LIMIT)

  // Look up which slugs actually exist as providers — a scrape output slug
  // may not have been imported (or may have since been deleted/reclaimed).
  // Slugs can be long (100+ chars); a large .in() batch overflows the HTTP
  // header size limit, so this uses a much smaller batch than the write step.
  const slugs = rows.map((r) => r.slug)
  const existingBySlug = new Map()
  for (const slugBatch of chunk(slugs, 80)) {
    const { data, error } = await supabase.from('providers').select('id, slug').in('slug', slugBatch)
    if (error) {
      log.error(`Failed to look up providers by slug: ${error.message}`)
      process.exit(1)
    }
    for (const p of data ?? []) existingBySlug.set(p.slug, p.id)
  }

  const matched = rows.filter((r) => existingBySlug.has(r.slug))
  const unmatched = rows.length - matched.length
  log.info(`${matched.length} slug(s) matched an existing provider (${unmatched} not found in DB — skipped)`)

  if (DRY_RUN) {
    log.info('[dry-run] Skipping write.')
    for (const r of matched.slice(0, 10)) {
      log.info(`  would set ${r.business_name}: google_rating=${r.rating}, google_rating_count=${r.user_ratings_total ?? 0}`)
    }
    if (matched.length > 10) log.info(`  ...and ${matched.length - 10} more`)
    return
  }

  const now = new Date().toISOString()
  const updateRows = matched.map((r) => ({
    id: existingBySlug.get(r.slug),
    google_place_id: r.place_id ?? null,
    google_rating: r.rating,
    google_rating_count: r.user_ratings_total ?? 0,
    google_rating_fetched_at: now,
    // verified_google mirrors google_place_id — kept as a real column
    // (rather than derived at query time) for indexing and consistency with
    // the other verified_* columns. See
    // supabase/migrations/20260805100000_google_verification.sql.
    verified_google: Boolean(r.place_id),
  }))

  // Each row updates a different provider by id — not an insert, so this
  // uses per-row .update() (in parallelised batches) rather than .upsert(),
  // which requires every NOT NULL column (e.g. provider_type_id) to be
  // present even when only updating existing rows.
  const batches = chunk(updateRows, BATCH_SIZE)
  let updated = 0
  let failed = 0

  for (const [i, batch] of batches.entries()) {
    const results = await Promise.all(
      batch.map((row) =>
        supabase
          .from('providers')
          .update({
            google_place_id: row.google_place_id,
            google_rating: row.google_rating,
            google_rating_count: row.google_rating_count,
            google_rating_fetched_at: row.google_rating_fetched_at,
            verified_google: row.verified_google,
          })
          .eq('id', row.id),
      ),
    )

    const batchFailed = results.filter((r) => r.error).length
    updated += batch.length - batchFailed
    failed += batchFailed
    log.info(`Batch ${i + 1}/${batches.length}: updated ${batch.length - batchFailed}/${batch.length} (running total: ${updated})`)
    if (batchFailed > 0) {
      const firstError = results.find((r) => r.error)?.error
      log.error(`  ${batchFailed} row(s) in this batch failed: ${firstError?.message}`)
    }
  }

  log.info('----------------------------------------')
  log.info(`Done in ${elapsed()}`)
  log.info(`Updated:        ${updated}`)
  log.info(`Not found in DB: ${unmatched}`)
  if (failed > 0) log.error(`Failed rows: ${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
