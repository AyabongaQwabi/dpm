import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPlatformConfig, PRICE_CHANGE_BANDS } from '@/lib/platform-config'
import { loadProviderPlan } from '@/lib/provider-plan'
import {
  calculateCommissionFull,
  checkDiscountEligibility,
  type ServicePricing,
  type FullCommissionResult,
} from '@/lib/domain/payments'

export interface CommissionContext {
  ceilingRate: number | null
  discountBonusOptedIn: boolean
  activeTemporaryReduction: number | null
}

export async function loadCommissionContext(
  supabase: SupabaseClient,
  providerId: string,
  serviceId: string,
): Promise<CommissionContext> {
  const now = new Date().toISOString()

  const [plan, { data: bonusOpt }, { data: tempReduction }] = await Promise.all([
    loadProviderPlan(supabase, providerId, { activeOnly: true }),
    supabase
      .from('service_discount_bonus_opts')
      .select('id')
      .eq('service_id', serviceId)
      .is('opted_out_at', null)
      .maybeSingle(),
    supabase
      .from('provider_temp_reductions')
      .select('reduction_points')
      .eq('provider_id', providerId)
      .is('cancelled_at', null)
      .gt('active_until', now)
      .maybeSingle(),
  ])

  return {
    ceilingRate: plan.ceilingRate,
    discountBonusOptedIn: !!bonusOpt,
    activeTemporaryReduction: tempReduction ? Number(tempReduction.reduction_points) : null,
  }
}

/** Compute commission for a booking using provider ceiling, bonus, and temp reduction. */
export async function calculateBookingCommission(
  supabase: SupabaseClient,
  providerId: string,
  packageId: string,
  pricing: ServicePricing,
): Promise<FullCommissionResult> {
  const { data: pkg } = await supabase
    .from('service_packages')
    .select('service_id, price')
    .eq('id', packageId)
    .single()

  if (!pkg) throw new Error('Package not found')

  const serviceId = pkg.service_id as string
  const config = await loadPlatformConfig()
  const ctx = await loadCommissionContext(supabase, providerId, serviceId)

  const { data: lastSale } = await supabase
    .from('service_sale_prices')
    .select('sale_price')
    .eq('package_id', packageId)
    .order('sold_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentListPrice = Number(pkg.price)
  const lastSalePrice = lastSale ? Number(lastSale.sale_price) : null

  const discountBonusEligible = checkDiscountEligibility({
    currentListPrice,
    lastSalePrice,
  }, PRICE_CHANGE_BANDS)

  return calculateCommissionFull(
    {
      pricing,
      ceilingRate: ctx.ceilingRate,
      discountBonusEligible,
      discountBonusOptedIn: ctx.discountBonusOptedIn,
      activeTemporaryReduction: ctx.activeTemporaryReduction,
    },
    config,
  )
}

/**
 * Compute commission for a quote-originated booking.
 *
 * Quote bookings have package_id = null in v1, so they deliberately do not
 * participate in package-keyed prior-sale checks or the Discount 4 Discount
 * bonus. They still use the same bracket, ceiling, temporary reduction and
 * stacking-floor calculation as every other booking.
 */
export async function calculateQuoteBookingCommission(
  supabase: SupabaseClient,
  providerId: string,
  quoteTotalAmount: number,
): Promise<FullCommissionResult> {
  const now = new Date().toISOString()

  const [plan, { data: tempReduction }] = await Promise.all([
    loadProviderPlan(supabase, providerId, { activeOnly: true }),
    supabase
      .from('provider_temp_reductions')
      .select('reduction_points')
      .eq('provider_id', providerId)
      .is('cancelled_at', null)
      .gt('active_until', now)
      .maybeSingle(),
  ])

  const config = await loadPlatformConfig()

  return calculateCommissionFull(
    {
      pricing: {
        price: quoteTotalAmount,
        discountType: 'none',
        discountAmount: null,
      },
      ceilingRate: plan.ceilingRate,
      discountBonusEligible: false,
      discountBonusOptedIn: false,
      activeTemporaryReduction: tempReduction
        ? Number(tempReduction.reduction_points)
        : null,
    },
    config,
  )
}
