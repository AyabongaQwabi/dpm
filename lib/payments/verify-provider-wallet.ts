import { createAdminClient } from '@/lib/supabase/admin'
import { getProviderWalletBalance } from '@/lib/actions/provider-wallet'

export type CheckProviderTopUpResult = {
  credited: boolean
  balance: number
  amount?: number
}

/**
 * Checks whether the provider wallet top-up webhook has posted the ledger row.
 * Yoco confirms only via webhook, so a missing row means "still processing",
 * not "success".
 */
export async function checkProviderTopUpApplied(
  reference: string,
  providerId: string,
): Promise<CheckProviderTopUpResult> {
  const admin = createAdminClient()
  const { data: existingTx } = await admin
    .from('provider_credit_transactions')
    .select('amount')
    .eq('provider_id', providerId)
    .eq('yoco_ref', reference)
    .eq('type', 'topup')
    .maybeSingle()

  const balance = await getProviderWalletBalance(providerId)

  if (existingTx) {
    return {
      credited: true,
      balance,
      amount: Number(existingTx.amount),
    }
  }

  return { credited: false, balance }
}
