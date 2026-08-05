import { createAdminClient } from '@/lib/supabase/admin'

export type CheckCreditsResult = {
  credited: boolean
  balance: number
  totalCredits?: number
}

async function fetchCustomerBalance(customerId: string): Promise<number> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('customers')
    .select('credit_balance')
    .eq('id', customerId)
    .single()

  return data?.credit_balance ?? 0
}

/**
 * Checks whether the Yoco webhook has already applied credits for this
 * checkout reference. Yoco's Checkout API has no verify-by-reference
 * endpoint (unlike Paystack's transaction/verify), so
 * app/api/webhooks/yoco/route.ts is the sole writer of credit_transactions —
 * this just reads what it wrote. `credited: false` means "not yet" (the
 * webhook may still be in flight), not "failed" — callers should poll
 * briefly rather than show a hard failure.
 */
export async function checkCreditsApplied(
  reference: string,
  customerId: string,
): Promise<CheckCreditsResult> {
  const admin = createAdminClient()
  const { data: existingTx } = await admin
    .from('credit_transactions')
    .select('amount, bonus_credits')
    .eq('yoco_ref', reference)
    .maybeSingle()

  const balance = await fetchCustomerBalance(customerId)

  if (existingTx) {
    return {
      credited: true,
      balance,
      totalCredits: existingTx.amount + (existingTx.bonus_credits ?? 0),
    }
  }

  return { credited: false, balance }
}
