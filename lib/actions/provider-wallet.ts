import { createAdminClient } from '@/lib/supabase/admin'

export interface ProviderWalletTransaction {
  id: string
  provider_id: string
  type: 'topup' | 'debit' | 'refund' | 'adjustment'
  amount: number
  balance_after: number
  reference_type: string
  reference_id: string | null
  yoco_ref: string | null
  notes: string | null
  created_at: string
}

export interface ProviderWalletSnapshot {
  balance: number
  transactions: ProviderWalletTransaction[]
  totalTransactions: number
  page: number
  pageSize: number
}

export async function ensureProviderWallet(providerId: string): Promise<number> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('provider_credit_wallets')
    .select('balance')
    .eq('provider_id', providerId)
    .maybeSingle()

  if (existing) return Number(existing.balance ?? 0)

  const { data, error } = await admin
    .from('provider_credit_wallets')
    .upsert({ provider_id: providerId, balance: 0 }, { onConflict: 'provider_id' })
    .select('balance')
    .single()

  if (error) {
    console.error('ensureProviderWallet:', error.message)
    return 0
  }

  return Number(data?.balance ?? 0)
}

export async function getProviderWalletSnapshot(
  providerId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<ProviderWalletSnapshot> {
  const admin = createAdminClient()
  const balance = await ensureProviderWallet(providerId)
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize ?? 20)))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: transactions, error, count } = await admin
    .from('provider_credit_transactions')
    .select('id, provider_id, type, amount, balance_after, reference_type, reference_id, yoco_ref, notes, created_at', { count: 'exact' })
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('getProviderWalletSnapshot:', error.message)
    return { balance, transactions: [], totalTransactions: 0, page, pageSize }
  }

  return {
    balance,
    transactions: (transactions ?? []).map((tx) => ({
      ...tx,
      type: tx.type as ProviderWalletTransaction['type'],
      amount: Number(tx.amount),
      balance_after: Number(tx.balance_after),
    })),
    totalTransactions: count ?? transactions?.length ?? 0,
    page,
    pageSize,
  }
}

export async function getProviderWalletBalance(providerId: string): Promise<number> {
  return ensureProviderWallet(providerId)
}
