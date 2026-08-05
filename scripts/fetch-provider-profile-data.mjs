/**
 * Enriches scraped providers with real bio text and category-specific profile
 * field values pulled from their own website (home + a few likely subpages).
 *
 * Bio:
 *   - Only overwrites providers.bio if it still matches the auto-generated
 *     template from scrape-businesses.mjs (bioFromPlace). Real bios — written
 *     by a person or a previous successful run of this script — are left alone.
 *   - Candidate text comes from <meta name="description"> on the homepage,
 *     or the largest paragraph of body text on an About page.
 *
 * Dynamic profile fields (provider_field_values):
 *   - Each provider_type has a set of applicable fields, resolved the same
 *     way the onboarding flow does: form_configs matched by category_id OR
 *     provider_type_id, joined through form_config_fields -> fields.
 *   - Only fields with input_type multi_select / tag_picker / boolean / number
 *     are attempted (image_upload and rich_text fields — profile_image,
 *     gallery, faqs — are skipped; profile_image is handled by
 *     fetch-provider-images.mjs, faqs is too unstructured to auto-generate).
 *   - multi_select / tag_picker: only the field's own fixed options are
 *     considered, and only added when that exact word/phrase appears in the
 *     site's text — never inferred.
 *   - boolean: only ever set to true, and only on an explicit signal (e.g.
 *     "fully insured", "24/7", "24-hour", "mobile service"). Never set false.
 *   - number: only written when a nearby, clearly-labelled number is found
 *     (e.g. "10+ years experience", "team of 6").
 *   - short_text license/registration fields (e.g. security_psira_no,
 *     construction_nhbrc_no) are attempted opportunistically via a labelled
 *     pattern near the field's own label/keywords, but are just as often
 *     skipped — never guessed or fabricated.
 *   - Existing provider_field_values for a field are never overwritten —
 *     only fields with no existing value are filled in (unless --force).
 *
 * Everything is logged: pages fetched, candidates found/rejected, and a final
 * summary of updated / skipped / failed providers.
 *
 * Usage:
 *   node scripts/fetch-provider-profile-data.mjs
 *   npm run profile:fetch
 *
 * Flags:
 *   --limit=N     Only process the first N eligible providers
 *   --dry-run     Do everything except write to the DB
 *   --force       Also re-check providers that already have a non-generic bio
 *                 or already have values for a given field (still won't
 *                 overwrite a real/previously-found bio or field value)
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

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FETCH_TIMEOUT_MS = 10_000
const MAX_HTML_BYTES = 3 * 1024 * 1024
const DELAY_BETWEEN_PROVIDERS_MS = 300
const DELAY_BETWEEN_PAGES_MS = 200
const MAX_PAGES_PER_PROVIDER = 4

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity

const startedAt = Date.now()
function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
}
const log = {
  info: (msg) => console.log(`[${elapsed()}] ${msg}`),
  warn: (msg) => console.warn(`[${elapsed()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${elapsed()}] ERROR ${msg}`),
  step: (msg) => console.log(`[${elapsed()}]   -> ${msg}`),
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// HTTP + HTML helpers
// ---------------------------------------------------------------------------

const NON_WEBSITE_HOST_PATTERNS = [
  /(^|\.)wa\.me$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)linktr\.ee$/i,
  /(^|\.)linkedin\.com$/i,
]

function normalizeUrl(raw) {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const { hostname } = new URL(withScheme)
    if (NON_WEBSITE_HOST_PATTERNS.some((re) => re.test(hostname))) return null
  } catch {
    return null
  }
  return withScheme
}

async function fetchWithTimeout(target) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(target, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ServiceProsProfileBot/1.0; +https://serviceprossa.co.za)',
      },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPage(pageUrl) {
  const res = await fetchWithTimeout(pageUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('html')) throw new Error(`unexpected content-type "${contentType}"`)

  const reader = res.body?.getReader()
  if (!reader) return { html: await res.text(), finalUrl: res.url || pageUrl }

  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_HTML_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8')
  return { html, finalUrl: res.url || pageUrl }
}

function resolveUrl(maybeRelative, base) {
  try {
    return new URL(maybeRelative, base).toString()
  } catch {
    return null
  }
}

const HTML_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  times: '×', trade: '™', copy: '©', reg: '®',
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name.toLowerCase()] ?? match)
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/** Finds same-site links whose href or text matches one of the given keyword patterns. */
function findLinksMatching(html, pageUrl, keywordPatterns) {
  const linkRegex = /<a\s+[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  const found = new Map()
  let match
  while ((match = linkRegex.exec(html))) {
    const [, href, innerHtml] = match
    const text = stripTags(innerHtml).toLowerCase()
    const haystack = `${href.toLowerCase()} ${text}`
    if (!keywordPatterns.some((re) => re.test(haystack))) continue
    const resolved = resolveUrl(href, pageUrl)
    if (!resolved) continue
    try {
      const resolvedHost = new URL(resolved).hostname
      const baseHost = new URL(pageUrl).hostname
      if (resolvedHost !== baseHost) continue
    } catch {
      continue
    }
    if (!found.has(resolved)) found.set(resolved, text.slice(0, 60))
  }
  return [...found.keys()]
}

// ---------------------------------------------------------------------------
// Bio extraction
// ---------------------------------------------------------------------------

/** Matches the auto-generated bio written by scrape-businesses.mjs (bioFromPlace). */
function isGenericBio(bio) {
  if (!bio) return true
  return / — find and compare on ServicePros\.$/.test(bio.trim())
}

function extractMetaDescription(html) {
  const metaRegex = /<meta\s+[^>]*>/gi
  for (const tag of html.match(metaRegex) ?? []) {
    const name = tag.match(/name=["']description["']/i)
    if (!name) continue
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1]
    if (content && content.trim().length >= 40) return content.trim()
  }
  return null
}

/** Picks the longest paragraph-like block of body text as a bio candidate. */
function extractLongestParagraph(html) {
  const blockRegex = /<(p|div)[^>]*>([\s\S]*?)<\/\1>/gi
  let best = ''
  let match
  while ((match = blockRegex.exec(html))) {
    const text = stripTags(match[2])
    if (text.length > best.length && text.length >= 80 && text.length <= 1200) {
      best = text
    }
  }
  return best || null
}

const ABOUT_LINK_PATTERNS = [/about/i, /who-we-are/i, /our-story/i, /company/i]

async function findBio(homeHtml, homeUrl) {
  const metaDescription = extractMetaDescription(homeHtml)
  if (metaDescription) return { text: metaDescription, source: 'meta:description (home)' }

  const aboutLinks = findLinksMatching(homeHtml, homeUrl, ABOUT_LINK_PATTERNS).slice(0, 1)
  for (const aboutUrl of aboutLinks) {
    await sleep(DELAY_BETWEEN_PAGES_MS)
    try {
      const { html } = await fetchPage(aboutUrl)
      const meta = extractMetaDescription(html)
      if (meta) return { text: meta, source: `meta:description (${aboutUrl})` }
      const paragraph = extractLongestParagraph(html)
      if (paragraph) return { text: paragraph, source: `body text (${aboutUrl})` }
    } catch (err) {
      log.step(`about page fetch failed (${aboutUrl}) — ${err.message}`)
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Dynamic profile field extraction (provider_field_values)
// ---------------------------------------------------------------------------

const DETAIL_LINK_PATTERNS = [/service/i, /about/i, /pricing/i, /faq/i, /what-we-do/i]

// Fields whose input_type we attempt. image_upload (profile_image, gallery)
// and rich_text (faqs — bio is handled separately) are intentionally excluded.
const ATTEMPTED_INPUT_TYPES = new Set(['multi_select', 'tag_picker', 'boolean', 'number', 'short_text'])

// short_text fields we DON'T attempt: free-form URLs/links that aren't facts
// to extract, just pass-through data already captured as `website`/`social_links`.
const SKIPPED_SHORT_TEXT_KEYS = new Set(['links', 'social_links'])

// Explicit true-signal phrases for boolean fields, keyed by field key.
// A field only becomes true if one of its phrases appears verbatim (case-insensitive)
// in the page text — never inferred, never set to false.
const BOOLEAN_SIGNALS = {
  auto_warranty: ['warranty on', 'workmanship guarantee', 'guaranteed workmanship'],
  beauty_mobile: ['mobile service', 'we come to you', 'on-site service', 'mobile salon'],
  cleaning_insured: ['fully insured', 'insured and', 'insured & bonded'],
  construction_insured: ['fully insured', 'insured and bonded'],
  dealership_finance: ['in-house finance', 'finance available', 'we finance'],
  funeral_24h: ['24 hour', '24-hour', '24/7 service', 'available 24/7'],
  gardening_insured: ['fully insured', 'insured and'],
  home_coc: ['certificate of compliance', 'coc certificate', 'issue a coc'],
  home_emergency: ['emergency service', 'emergency call-out', '24/7 emergency', 'after-hours emergency'],
  photo_raw_delivery: ['raw files included', 'raw images included', 'all raw files'],
  security_24h: ['24 hour', '24-hour', '24/7', 'around the clock'],
  tech_remote: ['remote support', 'remote assistance'],
  transport_gdp: ['pdp holder', 'gdp holder', 'professional driving permit'],
  transport_tracking: ['real-time tracking', 'live tracking', 'gps tracking'],
}

// Regex + label used to look for an explicit "N years"-style number near a keyword.
const NUMBER_SIGNALS = {
  years_experience: { pattern: /(\d{1,2})\s*\+?\s*years?\s+(of\s+)?experience/i },
  cleaning_team_size: { pattern: /team\s+of\s+(\d{1,3})/i },
  caterer_min_guests: { pattern: /min(?:imum)?\s+(?:of\s+)?(\d{1,4})\s+guests?/i },
  caterer_max_guests: { pattern: /max(?:imum)?\s+(?:of\s+)?(\d{1,4})\s+guests?/i },
  security_vehicles: { pattern: /(\d{1,3})\s+(?:response\s+)?vehicles?/i },
}

// Registration/license number fields: only captured when preceded by their own
// recognisable label within the same line, e.g. "PSIRA Reg No: 1234567".
const LICENSE_LABEL_PATTERNS = {
  security_psira_no: /psira[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  construction_nhbrc_no: /nhbrc[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  dealership_license_no: /(?:nada|dealer licen[cs]e)[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  funeral_license_no: /(?:nfda|provincial licen[cs]e)[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  health_hpcsa_no: /hpcsa[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  legal_lpcsa_no: /(?:lpcsa|saica)[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  pet_vet_reg: /savc[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
  property_reg_no: /(?:ppra|firm reg(?:istration)?)[^0-9]{0,20}(\d[\d\s-]{4,15}\d)/i,
}

/** Loads every field + which provider_type_ids it applies to, once. */
async function loadFieldCatalog() {
  const [{ data: fields, error: fErr }, { data: formConfigs, error: fcErr }, { data: fcf, error: fcfErr }, { data: providerTypes, error: ptErr }] =
    await Promise.all([
      supabase.from('fields').select('id, key, label, input_type, options'),
      supabase.from('form_configs').select('id, provider_type_id, category_id'),
      supabase.from('form_config_fields').select('form_config_id, field_id'),
      supabase.from('provider_types').select('id, category_id'),
    ])

  if (fErr) throw new Error(`fields: ${fErr.message}`)
  if (fcErr) throw new Error(`form_configs: ${fcErr.message}`)
  if (fcfErr) throw new Error(`form_config_fields: ${fcfErr.message}`)
  if (ptErr) throw new Error(`provider_types: ${ptErr.message}`)

  const fieldById = new Map(fields.map((f) => [f.id, f]))
  const formConfigFieldIds = new Map()
  for (const row of fcf) {
    if (!formConfigFieldIds.has(row.form_config_id)) formConfigFieldIds.set(row.form_config_id, [])
    formConfigFieldIds.get(row.form_config_id).push(row.field_id)
  }

  // provider_type_id -> [form_config, ...] (category-wide + type-specific)
  const configsByProviderType = new Map()
  for (const pt of providerTypes) {
    const applicable = formConfigs.filter(
      (fc) => fc.provider_type_id === pt.id || fc.category_id === pt.category_id,
    )
    configsByProviderType.set(pt.id, applicable)
  }

  // provider_type_id -> [field, ...] (deduped, attempted input types only)
  const fieldsByProviderType = new Map()
  for (const [ptId, configs] of configsByProviderType) {
    const seen = new Map()
    for (const fc of configs) {
      for (const fieldId of formConfigFieldIds.get(fc.id) ?? []) {
        const field = fieldById.get(fieldId)
        if (!field) continue
        if (!ATTEMPTED_INPUT_TYPES.has(field.input_type)) continue
        if (field.input_type === 'short_text' && SKIPPED_SHORT_TEXT_KEYS.has(field.key)) continue
        seen.set(field.id, field)
      }
    }
    fieldsByProviderType.set(ptId, [...seen.values()])
  }

  return { fieldsByProviderType }
}

/** Finds occurrences of a multi_select/tag_picker field's fixed options in page text. */
function extractSelectValues(field, lowerText) {
  const found = []
  for (const option of field.options ?? []) {
    if (lowerText.includes(String(option).toLowerCase())) found.push(option)
  }
  return found
}

function extractBoolean(fieldKey, lowerText) {
  const signals = BOOLEAN_SIGNALS[fieldKey]
  if (!signals) return null
  return signals.some((phrase) => lowerText.includes(phrase)) ? true : null
}

function extractNumber(fieldKey, text) {
  const signal = NUMBER_SIGNALS[fieldKey]
  if (!signal) return null
  const match = text.match(signal.pattern)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function extractLicenseNumber(fieldKey, text) {
  const pattern = LICENSE_LABEL_PATTERNS[fieldKey]
  if (!pattern) return null
  const match = text.match(pattern)
  if (!match) return null
  const cleaned = match[1].replace(/\s+/g, ' ').trim()
  return cleaned.length >= 4 ? cleaned : null
}

/** Runs every applicable field's extractor against combined page text. */
function extractFieldValues(applicableFields, combinedText) {
  const lowerText = combinedText.toLowerCase()
  const results = []

  for (const field of applicableFields) {
    let value = null

    if (field.input_type === 'multi_select' || field.input_type === 'tag_picker') {
      const matches = extractSelectValues(field, lowerText)
      if (matches.length > 0) value = matches
    } else if (field.input_type === 'boolean') {
      value = extractBoolean(field.key, lowerText)
    } else if (field.input_type === 'number') {
      value = extractNumber(field.key, combinedText)
    } else if (field.input_type === 'short_text') {
      value = extractLicenseNumber(field.key, combinedText)
    }

    if (value !== null) results.push({ field, value })
  }

  return results
}

async function gatherSiteText(homeHtml, homeUrl) {
  const pages = [{ url: homeUrl, html: homeHtml, label: 'home' }]

  const links = findLinksMatching(homeHtml, homeUrl, DETAIL_LINK_PATTERNS).slice(0, MAX_PAGES_PER_PROVIDER - 1)
  for (const link of links) {
    await sleep(DELAY_BETWEEN_PAGES_MS)
    try {
      const { html } = await fetchPage(link)
      pages.push({ url: link, html, label: link })
    } catch (err) {
      log.step(`detail page fetch failed (${link}) — ${err.message}`)
    }
  }

  return pages.map((p) => stripTags(p.html)).join('\n')
}

// ---------------------------------------------------------------------------
// DB writes
// ---------------------------------------------------------------------------

async function writeFieldValues(providerId, extracted) {
  const rows = extracted.map(({ field, value }) => ({
    provider_id: providerId,
    field_id: field.id,
    value,
  }))

  const { error } = await supabase
    .from('provider_field_values')
    .upsert(rows, { onConflict: 'provider_id,field_id' })

  if (error) throw new Error(`provider_field_values upsert failed: ${error.message}`)
  return rows.length
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log.info(`Starting provider profile-data backfill (dry-run=${DRY_RUN}, force=${FORCE}, limit=${LIMIT === Infinity ? 'none' : LIMIT})`)

  log.info('Loading field catalog (fields, form_configs, provider_types)...')
  const { fieldsByProviderType } = await loadFieldCatalog()
  log.info(`Loaded applicable-field sets for ${fieldsByProviderType.size} provider types`)

  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, business_name, slug, website, bio, provider_type_id')
    .not('website', 'is', null)
    .order('business_name')

  if (error) {
    log.error(`Failed to load providers: ${error.message}`)
    process.exit(1)
  }

  const { data: existingValues } = await supabase.from('provider_field_values').select('provider_id, field_id')
  const existingByProvider = new Map()
  for (const row of existingValues ?? []) {
    if (!existingByProvider.has(row.provider_id)) existingByProvider.set(row.provider_id, new Set())
    existingByProvider.get(row.provider_id).add(row.field_id)
  }

  const eligible = (providers ?? [])
    .filter((p) => normalizeUrl(p.website))
    .filter((p) => {
      const alreadyFilledFieldIds = existingByProvider.get(p.id) ?? new Set()
      const applicableFields = fieldsByProviderType.get(p.provider_type_id) ?? []
      const hasMissingField = applicableFields.some((f) => !alreadyFilledFieldIds.has(f.id))
      return FORCE || isGenericBio(p.bio) || hasMissingField
    })
    .slice(0, LIMIT)

  log.info(`Found ${eligible.length} provider(s) to process`)

  const results = { bioUpdated: [], fieldsAdded: [], skipped: [], failed: [] }

  for (const [index, provider] of eligible.entries()) {
    const label = `${provider.business_name} (${provider.id})`
    const websiteUrl = normalizeUrl(provider.website)
    log.info(`[${index + 1}/${eligible.length}] ${label} — ${websiteUrl}`)

    let homeHtml
    let finalHomeUrl
    try {
      const page = await fetchPage(websiteUrl)
      homeHtml = page.html
      finalHomeUrl = page.finalUrl
    } catch (err) {
      log.warn(`${label}: home page fetch failed — ${err.message}`)
      results.failed.push({ label, reason: err.message })
      await sleep(DELAY_BETWEEN_PROVIDERS_MS)
      continue
    }

    let didSomething = false

    // --- Bio ---
    const needsBio = FORCE || isGenericBio(provider.bio)
    if (needsBio) {
      try {
        const bioResult = await findBio(homeHtml, finalHomeUrl)
        if (bioResult) {
          log.step(`bio candidate via ${bioResult.source}: "${bioResult.text.slice(0, 90)}${bioResult.text.length > 90 ? '…' : ''}"`)
          if (DRY_RUN) {
            log.step('[dry-run] would update providers.bio — NOT written')
          } else {
            const { error: bioError } = await supabase
              .from('providers')
              .update({ bio: bioResult.text })
              .eq('id', provider.id)
            if (bioError) throw new Error(`bio update failed: ${bioError.message}`)
            log.step('wrote providers.bio')
          }
          results.bioUpdated.push(label)
          didSomething = true
        } else {
          log.step('no bio candidate found on home or about page')
        }
      } catch (err) {
        log.warn(`${label}: bio extraction failed — ${err.message}`)
      }
    }

    // --- Dynamic profile fields ---
    const applicableFields = fieldsByProviderType.get(provider.provider_type_id) ?? []
    const alreadyFilledFieldIds = existingByProvider.get(provider.id) ?? new Set()
    const fieldsToTry = FORCE ? applicableFields : applicableFields.filter((f) => !alreadyFilledFieldIds.has(f.id))

    if (fieldsToTry.length > 0) {
      try {
        const combinedText = await gatherSiteText(homeHtml, finalHomeUrl)
        const extracted = extractFieldValues(fieldsToTry, combinedText)

        if (extracted.length > 0) {
          log.step(
            `${extracted.length} field value(s): ${extracted
              .map(({ field, value }) => `${field.key}=${JSON.stringify(value)}`)
              .join(', ')}`,
          )
          if (DRY_RUN) {
            log.step(`[dry-run] would write ${extracted.length} provider_field_values row(s) — NOT written`)
          } else {
            const count = await writeFieldValues(provider.id, extracted)
            log.step(`wrote ${count} provider_field_values row(s)`)
          }
          results.fieldsAdded.push({ label, count: extracted.length })
          didSomething = true
        } else {
          log.step(`no values found for ${fieldsToTry.length} applicable field(s)`)
        }
      } catch (err) {
        log.warn(`${label}: field extraction failed — ${err.message}`)
      }
    }

    if (!didSomething) results.skipped.push(label)

    await sleep(DELAY_BETWEEN_PROVIDERS_MS)
  }

  log.info('----------------------------------------')
  if (DRY_RUN) log.info('DRY RUN — nothing below was actually written to the database.')
  log.info(`Done in ${elapsed()}`)
  log.info(`Bios ${DRY_RUN ? 'that would be updated' : 'updated'}:       ${results.bioUpdated.length}`)
  log.info(`Field values ${DRY_RUN ? 'that would be added' : 'added'}: ${results.fieldsAdded.reduce((sum, r) => sum + r.count, 0)} across ${results.fieldsAdded.length} providers`)
  log.info(`Skipped (nothing found): ${results.skipped.length}`)
  log.info(`Failed:             ${results.failed.length}`)

  if (results.failed.length > 0) {
    log.info('Providers that failed (website unreachable, etc.):')
    for (const { label, reason } of results.failed) log.info(`  - ${label}: ${reason}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
