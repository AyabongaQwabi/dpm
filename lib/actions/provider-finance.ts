'use server'

import { revalidatePath } from 'next/cache'
import { requireProviderSession } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT } from '@/lib/platform-config'

function clean(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

export async function savePayoutMethod(formData: FormData) {
  const { provider } = await requireProviderSession()
  const method = clean(formData.get('method'))
  const nameOnAccount = clean(formData.get('nameOnAccount'))
  const bankName = clean(formData.get('bankName'))
  const accountType = clean(formData.get('accountType'))
  const accountNumber = clean(formData.get('accountNumber'))
  const branchCode = clean(formData.get('branchCode'))
  const payshapCellphone = clean(formData.get('payshapCellphone'))

  if (method !== 'bank' && method !== 'payshap') return
  if (!nameOnAccount || !bankName) return
  if (method === 'bank' && (!accountType || !accountNumber || !branchCode)) return
  if (method === 'payshap' && !payshapCellphone) return

  const admin = createAdminClient()
  await admin.from('provider_payout_methods').upsert(
    {
      provider_id: provider.id,
      method,
      name_on_account: nameOnAccount,
      bank_name: bankName,
      account_type: method === 'bank' ? accountType : null,
      account_number: method === 'bank' ? accountNumber : null,
      branch_code: method === 'bank' ? branchCode : null,
      payshap_cellphone: method === 'payshap' ? payshapCellphone : null,
    },
    { onConflict: 'provider_id' },
  )

  revalidatePath('/provider-dashboard/finance')
}

export async function requestProviderPayout(formData: FormData) {
  const { provider } = await requireProviderSession()
  const amount = Math.floor(Number(formData.get('amount')))
  const providerNote = clean(formData.get('providerNote'))

  if (!Number.isFinite(amount) || amount < PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT) return

  const admin = createAdminClient()

  const [{ data: method }, { data: bookings }, { data: requests }] = await Promise.all([
    admin
      .from('provider_payout_methods')
      .select('*')
      .eq('provider_id', provider.id)
      .maybeSingle(),
    admin
      .from('bookings')
      .select('provider_payout_amount')
      .eq('provider_id', provider.id)
      .eq('status', 'completed')
      .eq('payment_status', 'captured'),
    admin
      .from('provider_payout_requests')
      .select('amount, status')
      .eq('provider_id', provider.id)
      .in('status', ['processing', 'paid']),
  ])

  if (!method) return

  const earned = (bookings ?? []).reduce(
    (sum, row) => sum + Math.round(Number(row.provider_payout_amount ?? 0)),
    0,
  )
  const alreadyRequested = (requests ?? []).reduce(
    (sum, row) => sum + Math.round(Number(row.amount ?? 0)),
    0,
  )
  const available = Math.max(0, earned - alreadyRequested)

  if (amount > available) return

  await admin.from('provider_payout_requests').insert({
    provider_id: provider.id,
    amount,
    status: 'processing',
    method: method.method,
    name_on_account: method.name_on_account,
    bank_name: method.bank_name,
    account_type: method.account_type,
    account_number: method.account_number,
    branch_code: method.branch_code,
    payshap_cellphone: method.payshap_cellphone,
    provider_note: providerNote,
  })

  revalidatePath('/provider-dashboard/finance')
}
