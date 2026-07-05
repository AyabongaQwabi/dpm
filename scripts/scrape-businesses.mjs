#!/usr/bin/env node
/**
 * Google Places business scraper for ServicePros provider import.
 *
 * SETUP:
 * 1. Add GOOGLE_PLACES_API_KEY to .env.local (Google Cloud Console → Places API)
 * 2. Run: node scripts/scrape-businesses.mjs
 * 3. Review scripts/output/scraped-businesses.json
 * 4. Paste scripts/output/scraped-import.sql into Supabase SQL editor
 *
 * This script does NOT connect to Supabase — output only.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEARCH_CONFIG } from './scrape-search-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DELAY_MS = 200

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local optional if key set in shell
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function generateSlug(name, city, taken) {
  const base = slugify(name)
  const cityPart = city ? slugify(city) : ''
  let candidate = base
  if (cityPart && (base.split('-').length <= 2 || taken.has(base))) {
    candidate = `${base}-${cityPart}`
  }
  if (!taken.has(candidate)) return candidate
  let n = 2
  while (taken.has(`${candidate}-${n}`)) n++
  return `${candidate}-${n}`
}

function parseCityProvince(address) {
  if (!address) return { city: null, province: null }
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length < 2) return { city: parts[0] ?? null, province: null }
  const city = parts[parts.length - 3] ?? parts[parts.length - 2] ?? null
  const province = parts[parts.length - 2] ?? null
  return { city, province }
}

function escapeSql(value) {
  if (value == null) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function textSearch(query, apiKey) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('region', 'za')
  url.searchParams.set('key', apiKey)
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.warn(`Text search warning for "${query}": ${data.status} ${data.error_message ?? ''}`)
  }
  return data.results ?? []
}

async function placeDetails(placeId, apiKey) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,business_status,photos,address_components',
  )
  url.searchParams.set('key', apiKey)
  const res = await fetch(url)
  const data = await res.json()
  return data.result ?? null
}

function bioFromPlace(name, typeSlug, city) {
  const cityPart = city ? ` in ${city}` : ' across South Africa'
  return `Professional ${typeSlug.replace(/-/g, ' ')} services${cityPart}. ${name} — find and compare on ServicePros.`
}

async function main() {
  loadEnvLocal()
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error(`
Missing GOOGLE_PLACES_API_KEY.

1. Enable Places API in Google Cloud Console
2. Create an API key with Places API access
3. Add to .env.local:

   GOOGLE_PLACES_API_KEY=your_key_here
`)
    process.exit(1)
  }

  const seen = new Map()
  const takenSlugs = new Set()
  let apiCalls = 0

  for (const config of SEARCH_CONFIG) {
    for (const query of config.queries) {
      console.log(`Searching: ${query}`)
      const results = await textSearch(query, apiKey)
      apiCalls++
      await sleep(DELAY_MS)

      for (const result of results.slice(0, 20)) {
        if (!result.place_id || seen.has(result.place_id)) continue
        if (result.business_status === 'CLOSED_PERMANENTLY') continue

        const details = await placeDetails(result.place_id, apiKey)
        apiCalls++
        await sleep(DELAY_MS)

        if (!details?.name) continue

        const { city, province } = parseCityProvince(details.formatted_address)
        const slug = generateSlug(details.name, city, takenSlugs)
        takenSlugs.add(slug)

        seen.set(result.place_id, {
          place_id: result.place_id,
          category: config.category,
          type: config.type,
          business_name: details.name,
          slug,
          phone: details.formatted_phone_number ?? null,
          website: details.website ?? null,
          address: details.formatted_address ?? null,
          location_city: city,
          location_state: province,
          rating: details.rating ?? null,
          user_ratings_total: details.user_ratings_total ?? 0,
          bio: bioFromPlace(details.name, config.type, city),
        })

        console.log(`  + ${details.name} (${slug})`)
      }
    }
  }

  const businesses = [...seen.values()]
  const outDir = join(__dirname, 'output')
  mkdirSync(outDir, { recursive: true })

  const jsonPath = join(outDir, 'scraped-businesses.json')
  writeFileSync(jsonPath, JSON.stringify(businesses, null, 2))
  console.log(`\nWrote ${businesses.length} businesses to ${jsonPath}`)

  const sqlLines = [
    '-- ServicePros scraped business import',
    '-- Review scraped-businesses.json before running',
    '',
  ]

  for (const b of businesses) {
    sqlLines.push(`INSERT INTO providers (
  provider_type_id, business_name, slug, phone, website, address,
  location_city, location_state, bio, is_scraped, scraped_at,
  claim_status, is_published, onboarding_step
)
SELECT
  pt.id,
  ${escapeSql(b.business_name)},
  ${escapeSql(b.slug)},
  ${escapeSql(b.phone)},
  ${escapeSql(b.website)},
  ${escapeSql(b.address)},
  ${escapeSql(b.location_city)},
  ${escapeSql(b.location_state)},
  ${escapeSql(b.bio)},
  true,
  NOW(),
  'unclaimed',
  true,
  999
FROM provider_types pt
JOIN provider_categories pc ON pc.id = pt.category_id
WHERE pt.slug = ${escapeSql(b.type)} AND pc.slug = ${escapeSql(b.category)}
ON CONFLICT (slug) DO NOTHING;`)
    sqlLines.push('')
  }

  const sqlPath = join(outDir, 'scraped-import.sql')
  writeFileSync(sqlPath, sqlLines.join('\n'))
  console.log(`Wrote SQL to ${sqlPath}`)
  console.log(`Total Google API calls: ${apiCalls}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
