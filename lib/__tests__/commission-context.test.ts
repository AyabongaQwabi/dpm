import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateQuoteBookingCommission } from '@/lib/commission-context'
import { loadProviderPlan } from '@/lib/provider-plan'
import { getPackageByNumber } from '@/lib/domain/subscriptions'

vi.mock('@/lib/provider-plan', () => ({
  loadProviderPlan: vi.fn(),
}))

function makeSupabase() {
  const queriedTables: string[] = []

  const supabase = {
    from(table: string) {
      queriedTables.push(table)
      if (table === 'service_sale_prices' || table === 'service_discount_bonus_opts') {
        throw new Error(`Quote commission must not query ${table}`)
      }

      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        is() {
          return this
        },
        gt() {
          return this
        },
        async maybeSingle() {
          return { data: null, error: null }
        },
      }
    },
  } as unknown as SupabaseClient

  return { supabase, queriedTables }
}

describe('calculateQuoteBookingCommission', () => {
  it('computes from the quote total without package sale-history or D4D lookups', async () => {
    vi.mocked(loadProviderPlan).mockResolvedValue({
      subscription: null,
      packageNumber: 1,
      packageConfig: getPackageByNumber(1),
      ceilingRate: null,
      d4dBonus: null,
    })

    const { supabase, queriedTables } = makeSupabase()

    const result = await calculateQuoteBookingCommission(supabase, 'provider-1', 3500)

    expect(result.finalPrice).toBe(3500)
    expect(result.standardRate).toBe(0.085)
    expect(result.commissionAmount).toBe(297.5)
    expect(result.bonusApplied).toBe(false)
    expect(queriedTables).toEqual(['provider_temp_reductions'])
  })
})
