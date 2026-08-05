/**
 * Live-refreshes providers.google_rating / google_rating_count via the
 * Google Places Details API, for providers that already have a
 * google_place_id (from backfill-google-ratings.mjs or a prior run of this
 * script) but whose rating hasn't been fetched recently.
 *
 * Does NOT search for a place_id — that's what scrape-businesses.mjs does.
 * This script only refreshes providers that already have one on file.
 *
 * Does not touch the `reviews` table — see backfill-google-ratings.mjs for
 * why Google ratings are kept as a separate, clearly-labelled summary.
 *
 * Requires GOOGLE_PLACES_API_KEY in .env.local (same as scrape-businesses.mjs).
 *
 * Usage:
 *   node scripts/refresh-google-ratings.mjs
 *   npm run ratings:refresh
 *
 * Flags:
 *   --limit=N        Only refresh the first N eligible providers
 *   --dry-run        Fetch from Google but skip the DB write
 *   --stale-days=N   Only refresh ratings older than N days (default: 30).
 *                     Providers with no google_rating yet are always included.
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './load-env.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.GOOGLE_PLACES_API_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!apiKey) {
  console.error('Missing GOOGLE_PLACES_API_KEY (Google Cloud Console -> Places API)')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const staleDaysArg = args.find((a) => a.startsWith('--stale-days='))
const STALE_DAYS = staleDaysArg ? Number(staleDaysArg.split('=')[1]) : 30

const DELAY_MS = 200

const startedAt = Date.now()
function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
}
const log = {
  info: (msg) => console.log(`[${elapsed()}] ${msg}`),
  warn: (msg) => console.warn(`[${elapsed()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${elapsed()}] ERROR ${msg}`),
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function placeDetails(placeId) {
  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  detailsUrl.searchParams.set('place_id', placeId)
  detailsUrl.searchParams.set('fields', 'rating,user_ratings_total,business_status')
  detailsUrl.searchParams.set('key', apiKey)
  const res = await fetch(detailsUrl)
  const data = await res.json()
  if (data.status !== 'OK') {
    throw new Error(`${data.status}${data.error_message ? `: ${data.error_message}` : ''}`)
  }
  return data.result
}

async function main() {
  log.info(`Starting Google rating refresh (dry-run=${DRY_RUN}, limit=${LIMIT === Infinity ? 'none' : LIMIT}, stale-days=${STALE_DAYS})`)

  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, business_name, google_place_id, google_rating, google_rating_fetched_at')
    .not('google_place_id', 'is', null)
    .or(`google_rating_fetched_at.is.null,google_rating_fetched_at.lt.${staleCutoff}`)
    .order('business_name')

  if (error) {
    log.error(`Failed to load providers: ${error.message}`)
    process.exit(1)
  }

  const eligible = (providers ?? []).slice(0, LIMIT)
  log.info(`Found ${eligible.length} provider(s) due for a refresh`)

  let updated = 0
  let unchanged = 0
  let failed = 0

  for (const [index, provider] of eligible.entries()) {
    const label = `${provider.business_name} (${provider.id})`
    log.info(`[${index + 1}/${eligible.length}] ${label}`)

    try {
      const result = await placeDetails(provider.google_place_id)

      if (result.business_status === 'CLOSED_PERMANENTLY') {
        log.warn(`${label}: Google marks this business as permanently closed — not updating rating, flag for manual review`)
        unchanged++
        await sleep(DELAY_MS)
        continue
      }

      const rating = result.rating ?? null
      const ratingCount = result.user_ratings_total ?? 0

      if (rating === provider.google_rating) {
        log.info(`  unchanged: ${rating ?? 'no rating'} (${ratingCount} reviews)`)
        unchanged++
      } else {
        log.info(`  ${provider.google_rating ?? 'none'} -> ${rating ?? 'none'} (${ratingCount} reviews)`)
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('providers')
            .update({
              google_rating: rating,
              google_rating_count: ratingCount,
              google_rating_fetched_at: new Date().toISOString(),
            })
            .eq('id', provider.id)
          if (updateError) throw new Error(`update failed: ${updateError.message}`)
        }
        updated++
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      log.warn(`${label}: ${reason}`)
      failed++
    }

    await sleep(DELAY_MS)
  }

  log.info('----------------------------------------')
  if (DRY_RUN) log.info('DRY RUN — nothing above was actually written to the database.')
  log.info(`Done in ${elapsed()}`)
  log.info(`${DRY_RUN ? 'Would update' : 'Updated'}:  ${updated}`)
  log.info(`Unchanged: ${unchanged}`)
  log.info(`Failed:    ${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
