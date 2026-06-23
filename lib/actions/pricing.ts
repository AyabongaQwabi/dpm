'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import {
  evaluatePriceEdit,
  type DiscountType,
  type PriceEditCheckInput,
  type PricingNotification,
} from '@/lib/domain/payments'

// ─────────────────────────────────────────────────────────────────────────────
// updatePackagePrice
// Called when a provider saves a price or discount change on a service package.
//
// Flow:
//  1. Auth — verify provider session and ownership of the package
//  2. Load sale history — last sale price and completed sales in qualifying band
//  3. Run domain checks — evaluatePriceEdit returns notifications + band result
//  4. If priceHeld (≥50% increase) — insert a review hold instead of updating
//  5. Otherwise — update the package price directly
//  6. Persist sale price history is done on booking completion (see checkout.ts)
//  7. Dispatch notifications asynchronously (fire-and-forget, does not block save)
// ─────────────────────────────────────────────────────────────────────────────

interface UpdatePriceInput {
  packageId: string
  newPrice: number
  newDiscountType: DiscountType
  newDiscountPercent: number | null  // only when type is 'percent'
  newDiscountAmount: number | null   // only when type is 'amount'
}

interface UpdatePriceResult {
  ok: boolean
  held: boolean   // true = new price is pending review, old price stays live
  notifications: PricingNotification[]
  error?: string
}

export async function updatePackagePrice(
  input: UpdatePriceInput,
): Promise<UpdatePriceResult> {
  const { packageId, newPrice, newDiscountType, newDiscountPercent, newDiscountAmount } = input

  const session = await requireProviderSession()
  const providerId = session.provider.id
  const supabase = await createClient()

  // Load the package and verify ownership
  const { data: pkg } = await supabase
    .from('service_packages')
    .select('id, price, service_id, services!inner(id, provider_id)')
    .eq('id', packageId)
    .single()

  if (!pkg) return { ok: false, held: false, notifications: [], error: 'Package not found' }

  const service = Array.isArray(pkg.services) ? pkg.services[0] : pkg.services
  if ((service as { provider_id: string }).provider_id !== providerId) {
    return { ok: false, held: false, notifications: [], error: 'Unauthorized' }
  }

  const serviceId = (service as { id: string }).id

  // Load the last completed sale price for this package
  const { data: lastSaleRow } = await supabase
    .from('service_sale_prices')
    .select('sale_price')
    .eq('package_id', packageId)
    .order('sold_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastSalePrice = lastSaleRow ? Number(lastSaleRow.sale_price) : null

  // Count completed sales in the qualifying band (current list price × 0.95 to current list price)
  // This is what the anti-gaming check uses — sales history, NOT price edit history.
  let completedSalesInQualifyingBand = 0
  if (lastSalePrice !== null) {
    const bandLower = newPrice * 0.95
    const { count } = await supabase
      .from('service_sale_prices')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', packageId)
      .gte('sale_price', bandLower)
      .lte('sale_price', newPrice)

    completedSalesInQualifyingBand = count ?? 0
  }

  // Get provider's active ceiling package (if any)
  const { data: ceilingSub } = await supabase
    .from('provider_ceiling_subscriptions')
    .select('ceiling_rate')
    .eq('provider_id', providerId)
    .is('active_to', null)
    .maybeSingle()

  const ceilingRate = ceilingSub ? Number(ceilingSub.ceiling_rate) : null

  // Run domain evaluation — pure, no side effects
  const checkInput: PriceEditCheckInput = {
    providerId,
    serviceId,
    currentListPrice: newPrice,
    newDiscountType,
    newDiscountPercent,
    lastSalePrice,
    completedSalesInQualifyingBand,
    ceilingRate,
  }
  const notifications = evaluatePriceEdit(checkInput)

  const priceHeld = notifications.some((n) => n.type === 'price_held_for_review')

  const admin = createAdminClient()

  if (priceHeld && lastSalePrice !== null) {
    // ≥50% increase — insert a review hold; do NOT update the live package price
    const currentPrice = Number(pkg.price)
    const increasePercent = ((newPrice - lastSalePrice) / lastSalePrice) * 100

    // Resolve any existing hold for this package first
    await admin
      .from('service_price_review_holds')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('package_id', packageId)
      .eq('status', 'pending_review')

    await admin.from('service_price_review_holds').insert({
      service_id: serviceId,
      package_id: packageId,
      old_price: currentPrice,
      proposed_price: newPrice,
      increase_pct: Math.round(increasePercent * 100) / 100,
      status: 'pending_review',
    })

    // Still update discount settings even when price is held
    await admin
      .from('service_packages')
      .update({
        discount_type: newDiscountType,
        discount_amount: newDiscountType === 'percent' ? newDiscountPercent
          : newDiscountType === 'amount' ? newDiscountAmount
          : null,
      })
      .eq('id', packageId)

    void dispatchNotifications(notifications)
    revalidatePath('/provider-dashboard')

    return { ok: true, held: true, notifications }
  }

  // Normal update — price goes live immediately
  await admin
    .from('service_packages')
    .update({
      price: newPrice,
      discount_type: newDiscountType,
      discount_amount: newDiscountType === 'percent' ? newDiscountPercent
        : newDiscountType === 'amount' ? newDiscountAmount
        : null,
    })
    .eq('id', packageId)

  void dispatchNotifications(notifications)
  revalidatePath('/provider-dashboard')
  revalidatePath(`/services/${serviceId}`)

  return { ok: true, held: false, notifications }
}

// ─────────────────────────────────────────────────────────────────────────────
// optInDiscountBonus
// Provider explicitly opts into the discount-unlock bonus for a service.
// Only callable after receiving a discount_bonus_available notification.
// ─────────────────────────────────────────────────────────────────────────────

export async function optInDiscountBonus(serviceId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireProviderSession()
  const providerId = session.provider.id
  const supabase = await createClient()

  // Verify ownership
  const { data: service } = await supabase
    .from('services')
    .select('id, provider_id')
    .eq('id', serviceId)
    .eq('provider_id', providerId)
    .single()

  if (!service) return { ok: false, error: 'Service not found or unauthorized' }

  // Load active ceiling subscription
  const { data: ceilingSub } = await supabase
    .from('provider_ceiling_subscriptions')
    .select('ceiling_rate')
    .eq('provider_id', providerId)
    .is('active_to', null)
    .maybeSingle()

  if (!ceilingSub) return { ok: false, error: 'No active ceiling package — bonus requires a ceiling subscription' }

  const ceilingRate = Number(ceilingSub.ceiling_rate)

  // Bonus rate points per ceiling tier (matches CONFIG_KEYS.DISCOUNT_BONUS_*)
  const bonusMap: Record<string, number> = {
    '0.1': 0.025,
    '0.095': 0.030,
    '0.085': 0.035,
    '0.075': 0.045,
  }
  const key = String(ceilingRate)
  const bonusRate = bonusMap[key] ?? 0
  if (bonusRate === 0) return { ok: false, error: 'Unknown ceiling rate — cannot determine bonus' }

  const admin = createAdminClient()

  // Deactivate any existing opt-in for this service
  await admin
    .from('service_discount_bonus_opts')
    .update({ opted_out_at: new Date().toISOString() })
    .eq('service_id', serviceId)
    .is('opted_out_at', null)

  // Insert new opt-in
  await admin.from('service_discount_bonus_opts').insert({
    service_id: serviceId,
    provider_id: providerId,
    ceiling_rate: ceilingRate,
    bonus_rate: bonusRate,
  })

  revalidatePath('/provider-dashboard')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// dispatchNotifications — fire-and-forget async notification persistence
// Does not block the calling action. Caller uses `void dispatchNotifications()`
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchNotifications(notifications: PricingNotification[]): Promise<void> {
  if (notifications.length === 0) return

  const admin = createAdminClient()

  // Persist to a provider_notifications table if it exists, otherwise log.
  // The notifications table is assumed to be created separately if needed;
  // for now we log so the flow is exercised without requiring that schema.
  for (const notification of notifications) {
    // In production: await admin.from('provider_notifications').insert({ ... })
    console.log('[pricing notification]', notification.type, {
      providerId: notification.providerId,
      serviceId: notification.serviceId,
      payload: notification.payload,
    })
  }
}
