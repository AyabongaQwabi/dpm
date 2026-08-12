import Link from 'next/link'
import type { Metadata } from 'next'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { getPackageByNumber, daysRemaining } from '@/lib/domain/subscriptions'
import { formatCredits } from '@/lib/format-credits'
import { getProviderWalletSnapshot } from '@/lib/actions/provider-wallet'
import { checkProviderTopUpApplied } from '@/lib/payments/verify-provider-wallet'
import { getProMembership, purchaseProMembershipAction } from '@/lib/actions/pro-membership'
import { isWithinCancellationRefundWindow } from '@/lib/domain/pro-membership'
import { PRO_CANCELLATION_REFUND_WINDOW_HOURS, PRO_MEMBERSHIP_CONFIG } from '@/lib/entitlements'
import {
  clampProviderTopUpAmount,
  PROVIDER_WALLET_CREDIT_VALUE,
  PROVIDER_WALLET_MAX_TOP_UP_CREDITS,
  PROVIDER_WALLET_MIN_TOP_UP_CREDITS,
  PROVIDER_WALLET_TOP_UP_PRESETS,
} from '@/lib/provider-wallet-config'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'
import { PaymentPendingNotice } from '@/components/PaymentPendingNotice'
import { ProviderWalletTopUpClient } from '@/components/provider-dashboard/ProviderWalletTopUpClient'
import { ProCancelControl } from '@/components/provider-dashboard/ProCancelControl'

export const metadata: Metadata = {
  title: 'Billing',
  description: 'Manage your provider wallet, Pro membership, subscription, and transaction history.',
}

interface BillingPageProps {
  searchParams: Promise<{
    amount?: string
    status?: string
    reference?: string
    page?: string
    pro?: string
    proError?: string
    shortfall?: string
    period?: string
    refund?: string
  }>
}

const PAGE_SIZE = 10

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTxLabel(type: string): string {
  switch (type) {
    case 'topup':
      return 'Top-up'
    case 'debit':
      return 'Debit'
    case 'refund':
      return 'Refund'
    case 'adjustment':
      return 'Adjustment'
    default:
      return 'Transaction'
  }
}

function referenceLabel(referenceType: string, notes: string | null): string {
  if (notes) return notes
  return referenceType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function proSourceLabel(source: string): string {
  switch (source) {
    case 'purchased':
      return 'Purchased'
    case 'package_included':
      return 'Included with package'
    case 'granted':
      return 'Granted'
    default:
      return source
  }
}

function proIncludes() {
  return [
    'Expanded gallery',
    'Unlimited service listings',
    'Profile customisation',
    'Custom profile URL',
    'Raised post and story limits',
  ]
}

export default async function ProviderBillingPage({ searchParams }: BillingPageProps) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const params = await searchParams
  const page = Math.max(1, Math.round(Number(params.page)) || 1)

  let verifyTopUp: Awaited<ReturnType<typeof checkProviderTopUpApplied>> | null = null
  if (params.status === 'success' && params.reference) {
    verifyTopUp = await checkProviderTopUpApplied(params.reference, provider.id)
  }

  const [{ data: subscription }, { data: providerRow }, wallet, membership] = await Promise.all([
    supabase
      .from('provider_subscriptions')
      .select('*')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('providers')
      .select('verified_contact')
      .eq('id', provider.id)
      .single(),
    getProviderWalletSnapshot(provider.id, { page, pageSize: PAGE_SIZE }),
    getProMembership(provider.id),
  ])

  const balance = verifyTopUp?.balance ?? wallet.balance
  const initialAmount = params.amount ? clampProviderTopUpAmount(Number(params.amount)) : undefined
  const showPendingNotice = params.status === 'success' && params.reference && verifyTopUp && !verifyTopUp.credited
  const successMessage = params.status === 'success' && verifyTopUp?.credited && verifyTopUp.amount
    ? `Payment confirmed — ${formatCredits(verifyTopUp.amount)} added to your provider wallet.`
    : null

  const pkg = getPackageByNumber(subscription?.package_number ?? 1)
  const subscriptionStatus = subscription?.status ?? 'not_started'
  const nextBillingDate = subscription?.status === 'active' ? formatDate(subscription.billing_end) : null
  const totalPages = Math.max(1, Math.ceil(wallet.totalTransactions / wallet.pageSize))
  const shortfallAmount = params.shortfall ? Math.max(0, Math.round(Number(params.shortfall))) : 0
  const topUpAmount = Math.max(
    shortfallAmount,
    params.period === 'annual' ? PRO_MEMBERSHIP_CONFIG.annualFee : PRO_MEMBERSHIP_CONFIG.monthlyFee,
  )
  const refundParamAmount = params.refund ? Math.max(0, Math.round(Number(params.refund))) : 0
  const membershipWithinRefundWindow = membership?.started_at
    ? isWithinCancellationRefundWindow(membership.started_at, PRO_CANCELLATION_REFUND_WINDOW_HOURS)
    : false

  return (
    <div className="max-w-5xl space-y-8 px-4 py-6 sm:px-0">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your provider wallet, Pro membership, plan, and transaction history.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {showPendingNotice && <PaymentPendingNotice />}

      {params.pro === 'activated' && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          Pro membership activated.
        </div>
      )}

      {params.pro === 'cancelled' && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground">
          Pro cancellation recorded. Your Pro features stay active until the current period ends.
        </div>
      )}

      {params.pro === 'cancelled_refunded' && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          Pro cancelled and {formatCredits(refundParamAmount)} refunded to your provider wallet.
        </div>
      )}

      {params.proError === 'insufficient_balance' && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground">
          <p className="font-semibold">Add {formatCredits(shortfallAmount)} to activate Pro.</p>
          <p className="mt-1 text-muted-foreground">
            Your provider wallet has {formatCredits(balance)}. Top up first, then activate Pro from this page.
          </p>
          <Link
            href={`/provider-dashboard/billing?amount=${topUpAmount}`}
            className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Top up wallet
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Provider wallet balance</p>
            <p className="mt-1 text-4xl font-bold text-foreground">{formatCredits(balance)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{PROVIDER_WALLET_CREDIT_VALUE}</p>
          </div>
          <div className="w-full lg:max-w-md">
            <ProviderWalletTopUpClient
              presets={PROVIDER_WALLET_TOP_UP_PRESETS}
              minAmount={PROVIDER_WALLET_MIN_TOP_UP_CREDITS}
              maxAmount={PROVIDER_WALLET_MAX_TOP_UP_CREDITS}
              initialAmount={initialAmount}
              purchasesPaused={isFeaturePaused('purchases')}
              purchasesPausedMessage={getFeaturePauseMessage('purchases')}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Current plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Base subscription and commission package.</p>
          </div>
          <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Wallet settlement coming soon
          </span>
        </div>

        {subscription ? (
          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Package</p>
              <p className="mt-1 font-semibold text-foreground">{pkg.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly fee</p>
              <p className="mt-1 font-semibold text-foreground">R{Number(subscription.monthly_fee).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 font-semibold capitalize text-foreground">{subscriptionStatus.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Next billing date</p>
              <p className="mt-1 font-semibold text-foreground">{nextBillingDate ?? 'Coming soon'}</p>
            </div>
            {subscription.status === 'active' && (
              <p className="sm:col-span-2 lg:col-span-4 text-sm text-muted-foreground">
                {daysRemaining(subscription.billing_end)} day{daysRemaining(subscription.billing_end) === 1 ? '' : 's'} remaining in this billing period.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            No subscription row exists yet. Package billing will be settled from this wallet when the billing engine is live.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Pro membership</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pro is debited from your provider wallet.</p>
          </div>
          <Link href="/verification#pro-membership" className="text-sm font-medium text-primary-accent hover:underline">
            What Pro means
          </Link>
        </div>

        {!membership && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-sm text-muted-foreground">
                Pro gives you extra account features without changing verification status or search ranking.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-foreground sm:grid-cols-2">
                {proIncludes().map((item) => (
                  <li key={item} className="rounded-lg bg-muted/50 px-3 py-2">{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <form action={purchaseProMembershipAction} className="space-y-3">
                <input type="hidden" name="returnTo" value="billing" />
                <button
                  type="submit"
                  name="billingPeriod"
                  value="monthly"
                  disabled={!providerRow?.verified_contact}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Get Pro monthly · {formatCredits(PRO_MEMBERSHIP_CONFIG.monthlyFee)}
                </button>
                <button
                  type="submit"
                  name="billingPeriod"
                  value="annual"
                  disabled={!providerRow?.verified_contact}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Get Pro annual · {formatCredits(PRO_MEMBERSHIP_CONFIG.annualFee)}
                </button>
              </form>
              {!providerRow?.verified_contact && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Contact verification is required before buying Pro.
                </p>
              )}
            </div>
          </div>
        )}

        {membership?.status === 'active' && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1 font-semibold text-foreground">
                  {membership.cancelled_at ? 'Active until period end' : 'Active'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                <p className="mt-1 font-semibold text-foreground">{proSourceLabel(membership.source)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Renewal / end date</p>
                <p className="mt-1 font-semibold text-foreground">
                  {membership.current_period_end ? formatDate(membership.current_period_end) : 'Tied to package'}
                </p>
              </div>
            </div>

            {membership.source === 'purchased' && !membership.cancelled_at && (
              <ProCancelControl
                periodEndLabel={formatDate(membership.current_period_end) ?? 'the period end'}
                withinRefundWindow={membershipWithinRefundWindow}
                refundWindowHours={PRO_CANCELLATION_REFUND_WINDOW_HOURS}
              />
            )}

            {membership.source === 'purchased' && membership.cancelled_at && (
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
                Pro has been cancelled. Your features remain active until {formatDate(membership.current_period_end) ?? 'the current period end'}, then your expanded gallery, unlimited listings, profile customisation, custom URL, and raised publishing limits stop.
              </p>
            )}

            {membership.source === 'package_included' && (
              <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                This Pro membership is included with your current package, so there is no separate Pro cancel control. Change the package to remove package-included Pro.
              </p>
            )}

            {membership.source === 'granted' && (
              <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                This Pro membership was granted by ServicePros. Contact support if it should be changed.
              </p>
            )}
          </div>
        )}

        {membership?.status === 'lapsed' && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-sm text-muted-foreground">
                Pro has lapsed, so expanded gallery, unlimited listings, profile customisation, custom URL, and raised publishing limits are no longer active.
              </p>
            </div>
            <form action={purchaseProMembershipAction} className="rounded-xl border border-border bg-background p-4 space-y-3">
              <input type="hidden" name="returnTo" value="billing" />
              <button
                type="submit"
                name="billingPeriod"
                value="monthly"
                disabled={!providerRow?.verified_contact}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reactivate monthly · {formatCredits(PRO_MEMBERSHIP_CONFIG.monthlyFee)}
              </button>
              <button
                type="submit"
                name="billingPeriod"
                value="annual"
                disabled={!providerRow?.verified_contact}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reactivate annual · {formatCredits(PRO_MEMBERSHIP_CONFIG.annualFee)}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Transaction history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your provider wallet ledger.</p>
          </div>
          <Link
            href={`/provider-dashboard/billing/transactions.csv?page=${wallet.page}&pageSize=${wallet.pageSize}`}
            className="w-fit rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Download CSV
          </Link>
        </div>

        {!wallet.transactions.length ? (
          <p className="mt-5 text-sm text-muted-foreground">No provider wallet transactions yet.</p>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Running balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wallet.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(tx.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{formatTxLabel(tx.type)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{referenceLabel(tx.reference_type, tx.notes)}</td>
                      <td className={[
                        'px-4 py-3 text-right font-semibold tabular-nums',
                        tx.amount > 0 ? 'text-green-700' : 'text-foreground',
                      ].join(' ')}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-ZA')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {tx.balance_after.toLocaleString('en-ZA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Link
                  href={`/provider-dashboard/billing?page=${Math.max(1, wallet.page - 1)}`}
                  className={wallet.page <= 1 ? 'pointer-events-none text-muted-foreground/50' : 'font-medium text-primary-accent hover:underline'}
                >
                  Previous
                </Link>
                <span className="text-muted-foreground">Page {wallet.page} of {totalPages}</span>
                <Link
                  href={`/provider-dashboard/billing?page=${Math.min(totalPages, wallet.page + 1)}`}
                  className={wallet.page >= totalPages ? 'pointer-events-none text-muted-foreground/50' : 'font-medium text-primary-accent hover:underline'}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
