'use server'

// Server actions for sponsored placement purchase and re-checks (Batch C).
// Debits the provider credit wallet through the internal wallet RPC — never
// touches Yoco directly.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  isEligibleForSponsoredPlacement,
  canSellAnotherSlot,
  unusedSecondsAt,
  type SponsoredPlacementType,
} from '@/lib/domain/sponsored'
import {
  getSponsoredPricing,
  isSponsoredPlacementPurchasable,
  SPONSORED_RESCUE_GRANT_RESERVE_PCT,
  SPONSORED_MIN_RATING_THRESHOLD,
  SPONSORED_SLOT_INVENTORY_PER_SCOPE,
} from '@/lib/sponsored-config'

interface PurchaseInput {
  providerId: string
  placementType: SponsoredPlacementType
  categoryId: string | null
  city: string | null
  startsAt: Date
  endsAt: Date
}

const PLACEMENT_TYPES: SponsoredPlacementType[] = ['category_city_feature', 'floating_box', 'search_top_slot']

function addBillingUnit(start: Date, billingUnit: 'week' | 'month'): Date {
  const end = new Date(start)
  if (billingUnit === 'week') {
    end.setDate(end.getDate() + 7)
  } else {
    end.setMonth(end.getMonth() + 1)
  }
  return end
}

async function checkEligibility(providerId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: provider } = await admin
    .from('providers')
    .select('verified_contact')
    .eq('id', providerId)
    .single()

  const { data: reviews } = await admin
    .from('reviews')
    .select('rating')
    .eq('provider_id', providerId)

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  const { count: disputeCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('cancellation_reason', '__dispute__')

  return isEligibleForSponsoredPlacement({
    hasContactVerification: provider?.verified_contact ?? false,
    hasOpenDispute: (disputeCount ?? 0) > 0,
    averageRating,
    minRatingThreshold: SPONSORED_MIN_RATING_THRESHOLD,
  })
}

/**
 * Purchases a sponsored placement against the provider credit wallet.
 * Refuses to sell if: pricing isn't set (C.3), the provider isn't eligible
 * (C.2), or selling one more would eat into the 30% rescue_grant reserve
 * (C.2) for that placement_type + scope.
 */
export async function purchaseSponsoredPlacement(
  input: PurchaseInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { provider } = await requireProviderSession()
  if (provider.id !== input.providerId) {
    return { ok: false, error: 'Provider mismatch' }
  }

  if (!isSponsoredPlacementPurchasable(input.placementType)) {
    return { ok: false, error: 'not_yet_priced' }
  }
  const pricing = getSponsoredPricing(input.placementType)
  if (pricing.price === null) {
    return { ok: false, error: 'not_yet_priced' }
  }

  const eligible = await checkEligibility(input.providerId)
  if (!eligible) {
    return { ok: false, error: 'not_eligible' }
  }

  const admin = createAdminClient()

  // C.1/C.2: total reservation inventory is config-backed, separate from
  // the visible slot count. This keeps a one-visible-slot surface sellable
  // while preserving the configured rescue reserve.
  const totalSlots = SPONSORED_SLOT_INVENTORY_PER_SCOPE[input.placementType]
  let scopeQuery = admin
    .from('sponsored_placements')
    .select('id', { count: 'exact', head: true })
    .eq('placement_type', input.placementType)
    .eq('source', 'purchased')
    .eq('status', 'active')

  scopeQuery = input.categoryId
    ? scopeQuery.eq('category_id', input.categoryId)
    : scopeQuery.is('category_id', null)
  scopeQuery = input.city ? scopeQuery.eq('city', input.city) : scopeQuery.is('city', null)

  const { count: soldCount } = await scopeQuery

  if (!canSellAnotherSlot(totalSlots, soldCount ?? 0, SPONSORED_RESCUE_GRANT_RESERVE_PCT)) {
    return { ok: false, error: 'reserved_for_rescue_grant' }
  }

  const { error: spendError } = await admin.rpc('spend_provider_wallet', {
    p_provider_id: input.providerId,
    p_amount: pricing.price,
    p_reference_type: 'sponsored_placement',
    p_reference_id: null,
    p_description: `Sponsored placement: ${input.placementType}`,
    p_allow_negative: false,
  })

  if (spendError) {
    if (spendError.message.includes('Insufficient credit balance')) {
      return { ok: false, error: 'insufficient_balance' }
    }
    console.error('purchaseSponsoredPlacement spend:', spendError.message)
    return { ok: false, error: 'Purchase failed' }
  }

  const { error: insertError } = await admin.from('sponsored_placements').insert({
    provider_id: input.providerId,
    placement_type: input.placementType,
    category_id: input.categoryId,
    city: input.city,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    source: 'purchased',
    price_paid: pricing.price,
    status: 'active',
  })

  if (insertError) {
    console.error('purchaseSponsoredPlacement insert:', insertError.message)
    return { ok: false, error: 'Purchase recorded payment but failed to activate placement — contact support' }
  }

  return { ok: true }
}

export async function purchaseSponsoredPlacementAction(formData: FormData) {
  const { provider } = await requireProviderSession()
  const placementType = String(formData.get('placementType') ?? '') as SponsoredPlacementType
  if (!PLACEMENT_TYPES.includes(placementType)) {
    redirect('/provider-dashboard/sponsored?error=invalid_placement')
  }

  const admin = createAdminClient()
  const { data: providerRow } = await admin
    .from('providers')
    .select('id, location_city, provider_types!inner(category_id)')
    .eq('id', provider.id)
    .single()

  const providerType = Array.isArray(providerRow?.provider_types)
    ? providerRow.provider_types[0]
    : providerRow?.provider_types
  const categoryId = placementType === 'floating_box' ? null : providerType?.category_id ?? null
  const city = placementType === 'floating_box' ? null : providerRow?.location_city ?? null

  if (placementType !== 'floating_box' && (!categoryId || !city)) {
    redirect('/provider-dashboard/sponsored?error=missing_scope')
  }

  const pricing = getSponsoredPricing(placementType)
  if (pricing.price === null) {
    redirect('/provider-dashboard/sponsored?error=not_yet_priced')
  }

  const startsAt = new Date()
  const result = await purchaseSponsoredPlacement({
    providerId: provider.id,
    placementType,
    categoryId,
    city,
    startsAt,
    endsAt: addBillingUnit(startsAt, pricing.billingUnit),
  })

  if (!result.ok) {
    redirect(`/provider-dashboard/sponsored?error=${encodeURIComponent(result.error)}&amount=${pricing.price}`)
  }

  revalidatePath('/provider-dashboard/sponsored')
  revalidatePath('/')
  if (categoryId && city) {
    revalidatePath(`/providers/category/${categoryId}/in/${city}`)
  }
  redirect('/provider-dashboard/sponsored?status=reserved')
}

/**
 * Re-checks eligibility for every active purchased/rescue_grant placement.
 * A provider who falls below threshold mid-flight has the placement paused
 * and the unused time credited back (C.2) — intended to run on the same
 * daily cron as subscription/membership expiry.
 */
export async function recheckSponsoredEligibility(): Promise<{ paused: number; resumed: number }> {
  const admin = createAdminClient()
  const now = new Date()

  const { data: activePlacements } = await admin
    .from('sponsored_placements')
    .select('id, provider_id, ends_at')
    .eq('status', 'active')

  let paused = 0
  for (const placement of activePlacements ?? []) {
    const eligible = await checkEligibility(placement.provider_id)
    if (eligible) continue

    const unusedSeconds = unusedSecondsAt(new Date(placement.ends_at), now)
    await admin
      .from('sponsored_placements')
      .update({ status: 'paused', paused_at: now.toISOString(), credited_seconds: unusedSeconds })
      .eq('id', placement.id)
    paused++
  }

  // Resume paused placements whose provider is eligible again — extend
  // ends_at by the credited window so no purchased time is lost.
  const { data: pausedPlacements } = await admin
    .from('sponsored_placements')
    .select('id, provider_id, credited_seconds')
    .eq('status', 'paused')

  let resumed = 0
  for (const placement of pausedPlacements ?? []) {
    const eligible = await checkEligibility(placement.provider_id)
    if (!eligible) continue

    const newEndsAt = new Date(now.getTime() + placement.credited_seconds * 1000)
    await admin
      .from('sponsored_placements')
      .update({ status: 'active', paused_at: null, credited_seconds: 0, ends_at: newEndsAt.toISOString() })
      .eq('id', placement.id)
    resumed++
  }

  return { paused, resumed }
}

/**
 * Fetches active, in-window sponsored placements for a given type + scope.
 * Read-only helper for rendering — never reorders organic results; callers
 * render these in their own labelled slot alongside the unmodified organic
 * list (C.2).
 */
export async function getActiveSponsoredPlacements(
  placementType: SponsoredPlacementType,
  scope: { categoryId?: string | null; city?: string | null } = {},
) {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  let query = admin
    .from('sponsored_placements')
    .select('id, provider_id, starts_at, ends_at, source')
    .eq('placement_type', placementType)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gte('ends_at', now)

  if (scope.categoryId !== undefined) {
    query = scope.categoryId ? query.eq('category_id', scope.categoryId) : query.is('category_id', null)
  }
  if (scope.city !== undefined) {
    query = scope.city ? query.eq('city', scope.city) : query.is('city', null)
  }

  const { data } = await query
  return data ?? []
}
