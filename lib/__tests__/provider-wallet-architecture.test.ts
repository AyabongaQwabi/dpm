import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('provider wallet architecture', () => {
  const migration = read('supabase/migrations/20260812000000_pro_membership.sql')

  it('uses a separate provider wallet table and records balance_after in the ledger', () => {
    expect(migration).toContain('CREATE TABLE provider_credit_wallets')
    expect(migration).toContain('CREATE TABLE provider_credit_transactions')
    expect(migration).toContain('balance_after')
    expect(migration).toContain("type IN ('topup', 'debit', 'refund', 'adjustment')")
    expect(migration).not.toContain('provider_wallet_spend')
  })

  it('credits top-ups only through the webhook RPC, not the redirect initializer', () => {
    const initializer = read('app/api/payments/provider-wallet/initialize/route.ts')
    const webhook = read('app/api/webhooks/yoco/route.ts')

    expect(initializer).toContain("type: 'provider_wallet_topup'")
    expect(initializer).not.toContain('topup_provider_wallet')
    expect(webhook).toContain("metadata.type === 'provider_wallet_topup'")
    expect(webhook).toContain("admin.rpc('topup_provider_wallet'")
  })

  it('rejects insufficient spends unless allow_negative is explicitly passed', () => {
    expect(migration).toContain('p_allow_negative BOOLEAN DEFAULT FALSE')
    expect(migration).toContain('IF NOT p_allow_negative AND v_balance < p_amount THEN')
    expect(migration).toContain("RAISE EXCEPTION 'Insufficient credit balance'")
  })

  it('keeps provider wallet Yoco checkout creation isolated to the top-up route', () => {
    const providerWalletFiles = [
      'lib/actions/pro-membership.ts',
      'lib/actions/sponsored.ts',
      'app/provider-dashboard/pro/page.tsx',
      'app/provider-dashboard/billing/page.tsx',
      'app/provider-dashboard/wallet/page.tsx',
      'components/provider-dashboard/ProviderWalletTopUpClient.tsx',
    ]

    for (const file of providerWalletFiles) {
      expect(read(file), file).not.toContain('@/lib/payments/yoco')
    }

    expect(read('app/api/payments/provider-wallet/initialize/route.ts')).toContain('@/lib/payments/yoco')
  })

  it('uses billing as the single dashboard surface for wallet balance, Pro, and transaction history', () => {
    const billing = read('app/provider-dashboard/billing/page.tsx')
    const wallet = read('app/provider-dashboard/wallet/page.tsx')
    const pro = read('app/provider-dashboard/pro/page.tsx')
    const nav = read('components/provider-dashboard/DashboardSidebar.tsx')

    expect(billing).toContain('Provider wallet balance')
    expect(billing).toContain('Current plan')
    expect(billing).toContain('Pro membership')
    expect(billing).toContain('Transaction history')
    expect(billing).toContain('transactions.csv')
    expect(wallet).toContain("redirect(`/provider-dashboard/billing")
    expect(pro).toContain('Manage billing and Pro')
    expect(pro).not.toContain('Provider wallet balance')
    expect(nav).toContain("href: '/provider-dashboard/billing'")
    expect(nav).not.toContain("href: '/provider-dashboard/wallet'")
  })

  it('cancels purchased Pro at period end instead of immediately lapsing entitlements', () => {
    const actions = read('lib/actions/pro-membership.ts')
    const cancel = read('components/provider-dashboard/ProCancelControl.tsx')

    expect(actions).toContain('cancelPurchasedProMembershipAction')
    expect(actions).toContain('cancelled_at')
    expect(actions).toContain('entitlements remain active until current_period_end')
    expect(actions).not.toContain("status: 'cancelled'")
    expect(cancel).toContain('Your Pro features stay active until')
    expect(cancel).toContain('Confirm cancellation')
  })

  it('exports the same paginated provider wallet rows as CSV', () => {
    const billing = read('app/provider-dashboard/billing/page.tsx')
    const csv = read('app/provider-dashboard/billing/transactions.csv/route.ts')

    expect(billing).toContain('pageSize=${wallet.pageSize}')
    expect(csv).toContain('getProviderWalletSnapshot(provider.id, { page, pageSize })')
    expect(csv).toContain('Content-Disposition')
  })

  it('has no client component that writes provider wallet tables directly', () => {
    const client = read('components/provider-dashboard/ProviderWalletTopUpClient.tsx')

    expect(client).toContain("'use client'")
    expect(client).not.toContain('provider_credit_wallets')
    expect(client).not.toContain('provider_credit_transactions')
    expect(client).not.toContain('.from(')
  })
})
