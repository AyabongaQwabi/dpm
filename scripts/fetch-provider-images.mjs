/**
 * Backfills providers.profile_image for providers that don't have one yet.
 *
 * Strategy (in order):
 *   1. Fetch the provider's website HTML and look for a social preview image:
 *      <meta property="og:image">, then <meta name="twitter:image">.
 *   2. Fall back to the site's favicon: <link rel="icon"|"shortcut icon"|"apple-touch-icon">,
 *      then /favicon.ico as a last resort.
 *   3. Download the image, upload it to the `provider-assets` Supabase Storage bucket
 *      under `scraped-logos/<provider-id>.<ext>`, and set providers.profile_image
 *      to the public URL.
 *
 * Providers with no website, or where no image could be found/downloaded, are
 * left untouched and logged at the end so they can be handled manually.
 *
 * Usage:
 *   node scripts/fetch-provider-images.mjs
 *   npm run images:fetch
 *
 * Flags:
 *   --limit=N       Only process the first N eligible providers (default: all)
 *   --dry-run       Do everything except upload/write to the DB
 *   --force         Also (re)process providers that already have a profile_image
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

const BUCKET = 'provider-assets'
const FETCH_TIMEOUT_MS = 10_000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const DELAY_BETWEEN_PROVIDERS_MS = 300

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity

// Generic platform assets that aren't the business's actual logo/photo —
// seen when the "website" is really a wa.me/click-to-chat link, a bare
// website builder subdomain with no custom branding set up yet, etc.
const GENERIC_IMAGE_HOST_PATTERNS = [
  /(^|\.)static\.whatsapp\.net$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)wix\.com$/i,
  /(^|\.)wixstatic\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)linktr\.ee$/i,
]

function isGenericImageHost(imageUrl) {
  try {
    const { hostname } = new URL(imageUrl)
    return GENERIC_IMAGE_HOST_PATTERNS.some((re) => re.test(hostname))
  } catch {
    return false
  }
}

const ALLOWED_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/svg+xml': 'svg',
}

const startedAt = Date.now()
const log = {
  info: (msg) => console.log(`[${elapsed()}] ${msg}`),
  warn: (msg) => console.warn(`[${elapsed()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${elapsed()}] ERROR ${msg}`),
  step: (msg) => console.log(`[${elapsed()}]   -> ${msg}`),
}

function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
}

async function fetchWithTimeout(target, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(target, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ServiceProsImageBot/1.0; +https://serviceprossa.co.za)',
        ...options.headers,
      },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timer)
  }
}

// wa.me/call.whatsapp.com links and bare social profile URLs aren't a
// business's own website — skip them rather than pulling a generic platform image.
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

function resolveUrl(maybeRelative, base) {
  try {
    return new URL(maybeRelative, base).toString()
  } catch {
    return null
  }
}

/** Extracts the best candidate image URL from a page's <head> metadata. */
function extractImageCandidates(html, pageUrl) {
  const candidates = []

  const metaRegex = /<meta\s+[^>]*>/gi
  const metaTags = html.match(metaRegex) ?? []

  function metaAttr(tag, attrName) {
    const re = new RegExp(`${attrName}=["']([^"']+)["']`, 'i')
    return tag.match(re)?.[1]
  }

  for (const tag of metaTags) {
    const property = metaAttr(tag, 'property') ?? metaAttr(tag, 'name')
    if (!property) continue
    if (/^og:image(:secure_url)?$/i.test(property) || /^twitter:image(:src)?$/i.test(property)) {
      const content = metaAttr(tag, 'content')
      if (content) {
        const resolved = resolveUrl(content, pageUrl)
        if (resolved) {
          candidates.push({
            url: resolved,
            kind: /^og:/i.test(property) ? 'og:image' : 'twitter:image',
          })
        }
      }
    }
  }

  const linkRegex = /<link\s+[^>]*>/gi
  const linkTags = html.match(linkRegex) ?? []
  const iconRels = ['apple-touch-icon', 'icon', 'shortcut icon']

  for (const rel of iconRels) {
    for (const tag of linkTags) {
      const relAttr = tag.match(/rel=["']([^"']+)["']/i)?.[1]
      if (!relAttr) continue
      if (relAttr.toLowerCase() !== rel) continue
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
      if (href) {
        const resolved = resolveUrl(href, pageUrl)
        if (resolved) candidates.push({ url: resolved, kind: `favicon:${rel}` })
      }
    }
  }

  return candidates
}

async function tryDownloadImage(imageUrl) {
  try {
    const res = await fetchWithTimeout(imageUrl)
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` }

    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
    const ext = ALLOWED_CONTENT_TYPES[contentType]
    if (!ext) return { ok: false, reason: `unsupported content-type "${contentType}"` }

    const contentLength = Number(res.headers.get('content-length') ?? 0)
    if (contentLength && contentLength > MAX_IMAGE_BYTES) {
      return { ok: false, reason: `too large (${contentLength} bytes)` }
    }

    const buffer = new Uint8Array(await res.arrayBuffer())
    if (buffer.byteLength === 0) return { ok: false, reason: 'empty response body' }
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return { ok: false, reason: `too large (${buffer.byteLength} bytes)` }
    }

    return { ok: true, buffer, contentType, ext }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

/** Finds and downloads the best available image for one provider's website. */
async function findProviderImage(websiteUrl) {
  const pageRes = await fetchWithTimeout(websiteUrl).catch((err) => {
    throw new Error(`page fetch failed: ${err.message}`)
  })

  if (!pageRes.ok) {
    throw new Error(`page returned HTTP ${pageRes.status}`)
  }

  const html = await pageRes.text()
  const finalPageUrl = pageRes.url || websiteUrl
  const candidates = extractImageCandidates(html, finalPageUrl)

  // Prefer og:image / twitter:image over favicons.
  candidates.sort((a, b) => {
    const rank = (kind) => (kind.startsWith('og:') ? 0 : kind.startsWith('twitter:') ? 1 : 2)
    return rank(a.kind) - rank(b.kind)
  })

  // Always try the default /favicon.ico as a final fallback.
  const faviconFallback = resolveUrl('/favicon.ico', finalPageUrl)
  if (faviconFallback) candidates.push({ url: faviconFallback, kind: 'favicon:/favicon.ico' })

  for (const candidate of candidates) {
    if (isGenericImageHost(candidate.url)) {
      log.step(`skip candidate (${candidate.kind}) ${candidate.url} — generic platform asset, not the business's own image`)
      continue
    }
    const result = await tryDownloadImage(candidate.url)
    if (result.ok) {
      return { ...result, sourceUrl: candidate.url, kind: candidate.kind }
    }
    log.step(`skip candidate (${candidate.kind}) ${candidate.url} — ${result.reason}`)
  }

  return null
}

async function uploadProfileImage(providerId, image) {
  const path = `scraped-logos/${providerId}.${image.ext}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image.buffer, {
      contentType: image.contentType,
      upsert: true,
    })

  if (uploadError) throw new Error(`storage upload failed: ${uploadError.message}`)

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  log.info(`Starting provider image backfill (dry-run=${DRY_RUN}, force=${FORCE}, limit=${LIMIT === Infinity ? 'none' : LIMIT})`)

  let query = supabase
    .from('providers')
    .select('id, business_name, website, profile_image')
    .not('website', 'is', null)
    .order('business_name')

  if (!FORCE) {
    query = query.is('profile_image', null)
  }

  const { data: providers, error } = await query
  if (error) {
    log.error(`Failed to load providers: ${error.message}`)
    process.exit(1)
  }

  const eligible = (providers ?? []).filter((p) => normalizeUrl(p.website)).slice(0, LIMIT)
  log.info(`Found ${eligible.length} provider(s) to process`)

  const results = { updated: [], skippedNoWebsite: [], skippedNoImage: [], failed: [] }

  for (const [index, provider] of eligible.entries()) {
    const label = `${provider.business_name} (${provider.id})`
    const websiteUrl = normalizeUrl(provider.website)
    log.info(`[${index + 1}/${eligible.length}] ${label} — ${websiteUrl}`)

    if (!websiteUrl) {
      log.step('no usable website URL — skipping')
      results.skippedNoWebsite.push(label)
      continue
    }

    let image
    try {
      image = await findProviderImage(websiteUrl)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      log.warn(`${label}: ${reason}`)
      results.failed.push({ label, reason })
      await sleep(DELAY_BETWEEN_PROVIDERS_MS)
      continue
    }

    if (!image) {
      log.warn(`${label}: no usable image found (og:image, twitter:image, favicon all failed)`)
      results.skippedNoImage.push(label)
      await sleep(DELAY_BETWEEN_PROVIDERS_MS)
      continue
    }

    log.step(`found image via ${image.kind} — ${image.sourceUrl} (${image.buffer.byteLength} bytes, ${image.contentType})`)

    if (DRY_RUN) {
      log.step('[dry-run] would upload and update profile_image')
      results.updated.push(label)
      await sleep(DELAY_BETWEEN_PROVIDERS_MS)
      continue
    }

    try {
      const publicUrl = await uploadProfileImage(provider.id, image)
      const { error: updateError } = await supabase
        .from('providers')
        .update({ profile_image: publicUrl })
        .eq('id', provider.id)

      if (updateError) throw new Error(`db update failed: ${updateError.message}`)

      log.step(`uploaded -> ${publicUrl}`)
      results.updated.push(label)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      log.error(`${label}: ${reason}`)
      results.failed.push({ label, reason })
    }

    await sleep(DELAY_BETWEEN_PROVIDERS_MS)
  }

  log.info('----------------------------------------')
  if (DRY_RUN) log.info('DRY RUN — nothing below was actually written to the database.')
  log.info(`Done in ${elapsed()}`)
  log.info(`${DRY_RUN ? 'Would update' : 'Updated'}:            ${results.updated.length}`)
  log.info(`Skipped (no image): ${results.skippedNoImage.length}`)
  log.info(`Failed:             ${results.failed.length}`)

  if (results.skippedNoImage.length > 0) {
    log.info('Providers with no image found (need manual/AI-generated logo):')
    for (const label of results.skippedNoImage) log.info(`  - ${label}`)
  }

  if (results.failed.length > 0) {
    log.info('Providers that failed (website unreachable, etc.):')
    for (const { label, reason } of results.failed) log.info(`  - ${label}: ${reason}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
