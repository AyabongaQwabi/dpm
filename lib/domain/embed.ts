import { EMBED_RATE_LIMIT } from '@/lib/embed-config'

/** Strips protocol, path, and a leading "www." so origin_domain values compare consistently. */
export function normalizeOriginDomain(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let host = trimmed
  try {
    host = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname
  } catch {
    return null
  }

  host = host.toLowerCase().replace(/^www\./, '')
  return host.slice(0, 200) || null
}

export function rateLimitSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - EMBED_RATE_LIMIT.windowMinutes * 60 * 1000)
}

export function isRateLimited(recentRequestCount: number): boolean {
  return recentRequestCount >= EMBED_RATE_LIMIT.maxRequestsPerWindow
}
