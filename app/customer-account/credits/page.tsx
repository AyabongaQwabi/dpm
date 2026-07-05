import Link from 'next/link'
import type { Metadata } from 'next'
import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { loadConfigStore, getConfigJsonArray } from '@/lib/config-store'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import { getActivePromotion, getPromotionById } from '@/lib/credit-promotions'
import { formatCredits } from '@/lib/format-credits'
import { verifyAndApplyCredits } from '@/lib/payments/verify-credits'
import { CreditPurchaseClient } from '@/components/customer-account/CreditPurchaseClient'
import type { CreditTransactionType } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Credits',
  description: 'Buy and manage your Service Pros credit wallet.',
}

interface Props {
  searchParams: Promise<{ amount?: string; status?: string; reference?: string; trxref?: string }>
}

function formatPurchaseLine(tx: {
  amount: number
  bonus_credits: number | null
  promotion_id: string | null
}): string {
  const base = tx.amount
  const bonus = tx.bonus_credits ?? 0
  const total = base + bonus
  const promoName = tx.promotion_id ? getPromotionById(tx.promotion_id)?.name : null

  if (bonus > 0) {
    const promoSuffix = promoName ? ` — ${promoName}` : ''
    return `Paid R${base.toLocaleString('en-ZA')} · ${base.toLocaleString('en-ZA')} credits · +${bonus.toLocaleString('en-ZA')} bonus${promoSuffix} · ${formatCredits(total)} total`
  }

  return `Paid R${base.toLocaleString('en-ZA')} · +${base.toLocaleString('en-ZA')} credits`
}

function formatTransactionAmount(
  type: CreditTransactionType,
  amount: number,
  bonusCredits: number | null,
): string {
  if (type === 'purchase') {
    const bonus = bonusCredits ?? 0
    const total = amount + bonus
    return `+${total.toLocaleString('en-ZA')}`
  }
  if (amount > 0) return `+${amount.toLocaleString('en-ZA')}`
  return amount.toLocaleString('en-ZA')
}

export default async function CreditsPage({ searchParams }: Props) {
  const { customer } = await requireCustomerSession()
  const { amount: amountParam, status, reference, trxref } = await searchParams
  const paystackReference = reference ?? trxref
  const supabase = await createClient()

  const config = await loadConfigStore(supabase)
  const [packs, minAmount, maxAmount] = await Promise.all([
    getConfigJsonArray(config, CONFIG_KEYS.CREDIT_PACK_DENOMINATIONS),
    getConfigNumber(config, CONFIG_KEYS.CREDIT_PURCHASE_MIN),
    getConfigNumber(config, CONFIG_KEYS.CREDIT_PURCHASE_MAX),
  ])

  const activePromotion = getActivePromotion()

  let verifyResult: Awaited<ReturnType<typeof verifyAndApplyCredits>> | null = null
  if (status === 'success' && paystackReference) {
    verifyResult = await verifyAndApplyCredits(paystackReference, customer.id)
  }

  const [{ data: customerRow }, { data: transactions }] = await Promise.all([
    supabase.from('customers').select('credit_balance').eq('id', customer.id).single(),
    supabase
      .from('credit_transactions')
      .select('id, type, amount, bonus_credits, promotion_id, description, booking_id, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const balance = verifyResult?.balance ?? customerRow?.credit_balance ?? 0
  const initialAmount = amountParam ? Math.round(Number(amountParam)) : undefined

  const successMessage = (() => {
    if (status !== 'success') return null

    if (paystackReference && verifyResult) {
      if (verifyResult.verified) {
        if (verifyResult.alreadyApplied) {
          return 'Payment confirmed — your wallet has already been updated.'
        }
        if (verifyResult.credited && verifyResult.totalCredits) {
          return `Payment confirmed — ${formatCredits(verifyResult.totalCredits)} have been added to your wallet.`
        }
      }
      return 'We couldn\'t confirm this payment yet. Your balance will update automatically once Paystack confirms. If this doesn\'t resolve in a few minutes, contact support.'
    }

    return 'We couldn\'t confirm this payment yet. Your balance will update automatically once Paystack confirms. If this doesn\'t resolve in a few minutes, contact support.'
  })()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Buy credits from Namoota Technology and spend them on bookings. 1 credit = R1.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <div className="rounded-2xl border bg-card px-6 py-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Current balance</p>
        <p className="text-3xl font-bold mt-1">{formatCredits(balance)}</p>
      </div>

      <CreditPurchaseClient
        packs={packs}
        minAmount={minAmount}
        maxAmount={maxAmount}
        initialAmount={initialAmount}
        activePromotion={activePromotion}
      />

      <section>
        <h2 className="text-base font-semibold mb-4">Transaction history</h2>
        {!transactions?.length ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium text-right">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => {
                  const date = new Date(tx.created_at).toLocaleDateString('en-ZA', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                  const type = tx.type as CreditTransactionType
                  const signed = formatTransactionAmount(type, tx.amount, tx.bonus_credits)

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground align-top">{date}</td>
                      <td className="px-4 py-3 align-top">
                        {type === 'purchase' ? (
                          <>
                            <p className="font-medium">Purchase</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatPurchaseLine(tx)}
                            </p>
                          </>
                        ) : type === 'spend' ? (
                          <>
                            <p className="font-medium">Spent on booking</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                              −{Math.abs(tx.amount).toLocaleString('en-ZA')} credits · {tx.description}
                            </p>
                            {tx.booking_id && (
                              <Link
                                href="/customer-account/bookings"
                                className="text-xs text-primary hover:underline"
                              >
                                View booking
                              </Link>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Refund</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                              +{tx.amount.toLocaleString('en-ZA')} credits · {tx.description}
                            </p>
                            {tx.booking_id && (
                              <Link
                                href="/customer-account/bookings"
                                className="text-xs text-primary hover:underline"
                              >
                                View booking
                              </Link>
                            )}
                          </>
                        )}
                      </td>
                      <td className={[
                        'px-4 py-3 text-right font-semibold tabular-nums align-top',
                        type === 'purchase' || type === 'refund' ? 'text-green-700' : 'text-foreground',
                      ].join(' ')}>
                        {signed}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
