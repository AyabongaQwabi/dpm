import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DiscountType } from '@/lib/db'
import { reviewerDisplayName } from '@/lib/domain/reviews'
import { normalizeOriginDomain, rateLimitSince, isRateLimited } from '@/lib/domain/embed'
import { embedCorsHeaders } from '@/lib/embed-cors'
import { EMBED_WIDGET_DATA_MAX_AGE_SECONDS, EMBED_REVIEWS_MAX_ITEMS, EMBED_RATE_LIMIT } from '@/lib/embed-config'
import { logFunnelEvent } from '@/lib/liquidity/log-funnel-event'

export const runtime = 'nodejs'

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function effectivePrice(price: number, type: DiscountType, amount: number | null): number {
  if (type === 'none' || amount === null) return price
  if (type === 'amount') return Math.max(0, price - amount)
  return price * (1 - amount / 100)
}

function jsonWithCors(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...embedCorsHeaders(),
      'Cache-Control': `public, max-age=${EMBED_WIDGET_DATA_MAX_AGE_SECONDS}`,
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: embedCorsHeaders() })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'services'
  const originDomain = normalizeOriginDomain(
    searchParams.get('originDomain') ?? request.headers.get('referer'),
  )

  const admin = createAdminClient()

  if (originDomain) {
    // count: 'exact' would make Postgres visit and count every matching row
    // with no early-out — exactly the wrong shape for a popular widget on a
    // hot origin_domain. Bound the scan instead: ask for one row past the
    // threshold (LIMIT maxRequestsPerWindow + 1) off the
    // (origin_domain, created_at DESC) index and check the returned row
    // count, so the query cost is capped regardless of how many matching
    // rows actually exist beyond that point.
    const { data: recentRows } = await admin
      .from('funnel_events')
      .select('id')
      .eq('origin_domain', originDomain)
      .eq('provider_id', providerId)
      .gte('created_at', rateLimitSince().toISOString())
      .limit(EMBED_RATE_LIMIT.maxRequestsPerWindow + 1)

    if (isRateLimited(recentRows?.length ?? 0)) {
      return jsonWithCors({ error: 'Too many requests' }, 429)
    }
  }

  const { data: provider } = await admin
    .from('providers')
    .select(`
      id, slug, business_name, bio, profile_image, location_city,
      is_published, business_type, verified_contact, verified_cipc, verified_fica, verified_google,
      provider_types!inner(name, slug, provider_categories(name, slug)),
      services:services!services_provider_id_fkey(
        id, title, description, image, is_published, accepts_custom_quotes,
        service_packages(id, name, price, discount_type, discount_amount, is_default, display_order)
      ),
      reviews(id, rating, comment, created_at, customer:customers(name)),
      subscription:provider_subscriptions(status)
    `)
    .eq('id', providerId)
    .eq('is_published', true)
    .order('created_at', { referencedTable: 'reviews', ascending: false })
    .maybeSingle()

  if (!provider) {
    return jsonWithCors({ error: 'Not found' }, 404)
  }

  const activeSubscription = (Array.isArray(provider.subscription) ? provider.subscription : [provider.subscription])
    .filter(Boolean)
    .some((sub) => (sub as { status: string } | null)?.status === 'active')

  if (!activeSubscription) {
    return jsonWithCors({ error: 'unavailable', reason: 'subscription_inactive' }, 200)
  }

  void logFunnelEvent({
    eventType: 'embed_view',
    providerId,
    sessionId: `embed:${providerId}:${originDomain ?? 'unknown'}:${Date.now()}`,
    originDomain,
    metadata: { mode },
  })

  const type = first(provider.provider_types)
  const category = first(type?.provider_categories)
  const reviews = (provider.reviews ?? []) as Array<{
    id: string; rating: number; comment: string | null; created_at: string
    customer: { name: string } | { name: string }[] | null
  }>

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null

  const services = ((provider.services ?? []) as Array<{
    id: string; title: string; description: string; image: string | null
    is_published: boolean; accepts_custom_quotes: boolean | null
    service_packages: Array<{
      id: string; name: string; price: number
      discount_type: DiscountType; discount_amount: number | null; is_default: boolean; display_order: number
    }> | null
  }>)
    .filter((s) => s.is_published)
    .map((s) => {
      const packages = (s.service_packages ?? []).sort((a, b) => a.display_order - b.display_order)
      const acceptsCustomQuotes = !!s.accepts_custom_quotes
      if (!packages.length) {
        return {
          id: s.id,
          title: s.title,
          description: s.description,
          image: s.image,
          acceptsCustomQuotes,
          priceFrom: null,
        }
      }
      const priceFrom = Math.min(
        ...packages.map((p) => effectivePrice(Number(p.price), p.discount_type, p.discount_amount)),
      )
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        image: s.image,
        acceptsCustomQuotes,
        priceFrom,
      }
    })

  return jsonWithCors({
    provider: {
      id: provider.id,
      slug: provider.slug,
      businessName: provider.business_name,
      bio: provider.bio,
      profileImage: provider.profile_image,
      locationCity: provider.location_city,
      businessType: provider.business_type,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      verification: {
        contact: provider.verified_contact,
        cipc: provider.verified_cipc,
        fica: provider.verified_fica,
        google: provider.verified_google,
      },
      avgRating,
      reviewCount: reviews.length,
      serviceCount: services.length,
    },
    services: mode === 'services' ? services : undefined,
    reviews: mode === 'reviews'
      ? reviews
        .slice(0, EMBED_REVIEWS_MAX_ITEMS)
        .map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          reviewerName: reviewerDisplayName(first(r.customer)?.name),
        }))
      : undefined,
  })
}
