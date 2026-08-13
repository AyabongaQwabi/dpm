import type { SupabaseClient } from '@supabase/supabase-js'
import { getPackageByNumber } from '@/lib/domain/subscriptions'

export type ProviderSubscriptionSummary = {
  package_number: number | null
  monthly_fee: number | string | null
  status: string | null
  billing_end: string | null
}

export async function loadProviderPlan(
  supabase: SupabaseClient,
  providerId: string,
  options: { activeOnly?: boolean } = {},
) {
  let query = supabase
    .from('provider_subscriptions')
    .select('package_number, monthly_fee, status, billing_end')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (options.activeOnly) {
    query = query.eq('status', 'active')
  }

  const { data } = await query.maybeSingle()
  const packageNumber = normalizePackageNumber(data?.package_number)
  const packageConfig = getPackageByNumber(packageNumber)

  return {
    subscription: (data ?? null) as ProviderSubscriptionSummary | null,
    packageNumber,
    packageConfig,
    ceilingRate: packageConfig.ceilingRate,
    d4dBonus: packageConfig.d4dBonus,
  }
}

function normalizePackageNumber(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const number = Number(value ?? 1)
  return number >= 1 && number <= 5 ? (number as 1 | 2 | 3 | 4 | 5) : 1
}
