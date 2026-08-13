import Link from 'next/link'
import type { Metadata } from 'next'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT } from '@/lib/platform-config'
import { formatCredits } from '@/lib/format-credits'
import { requestProviderPayout, savePayoutMethod } from '@/lib/actions/provider-finance'
import { loadProviderPlan } from '@/lib/provider-plan'
import { FormSubmitButton } from '@/components/provider-dashboard/FormSubmitButton'

export const metadata: Metadata = {
  title: 'Finance',
  robots: { index: false, follow: false },
}

type PayoutMethod = {
  method: 'bank' | 'payshap'
  name_on_account: string
  bank_name: string
  account_type: string | null
  account_number: string | null
  branch_code: string | null
  payshap_cellphone: string | null
} | null

type BookingRow = {
  id: string
  status: string
  payment_status: string | null
  final_price: number
  commission_amount: number
  provider_payout_amount: number
  requested_at: string
  service: { title: string } | { title: string }[] | null
  package: {
    name: string
    price: number
    discount_type: string
    discount_amount: number | null
  } | {
    name: string
    price: number
    discount_type: string
    discount_amount: number | null
  }[] | null
  customer: { name: string } | { name: string }[] | null
}

type PayoutRequest = {
  id: string
  amount: number
  status: string
  method: string
  bank_name: string
  requested_at: string
  paid_at: string | null
  admin_note: string | null
}

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

function money(value: number) {
  return `R${Math.round(value).toLocaleString('en-ZA')}`
}

function discountText(type: string, amount: number | null, listPrice: number, finalPrice: number) {
  const value = Math.max(0, Math.round(listPrice - finalPrice))
  if (type === 'none' || amount === null || value === 0) return 'None'
  if (type === 'percent') return `${amount}% (${money(value)})`
  return `${money(Number(amount))}`
}

export default async function ProviderFinancePage() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [
    { data: bookings },
    { data: payoutMethod },
    { data: payoutRequests },
    plan,
    { data: tempReduction },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, status, payment_status, final_price, commission_amount, provider_payout_amount, requested_at,
        service:services!bookings_service_id_fkey(title),
        package:service_packages!bookings_package_id_fkey(name, price, discount_type, discount_amount),
        customer:customers!bookings_customer_id_fkey(name)
      `)
      .eq('provider_id', provider.id)
      .order('requested_at', { ascending: false })
      .limit(200),
    supabase
      .from('provider_payout_methods')
      .select('*')
      .eq('provider_id', provider.id)
      .maybeSingle(),
    supabase
      .from('provider_payout_requests')
      .select('id, amount, status, method, bank_name, requested_at, paid_at, admin_note')
      .eq('provider_id', provider.id)
      .order('requested_at', { ascending: false })
      .limit(50),
    loadProviderPlan(supabase, provider.id),
    supabase
      .from('provider_temp_reductions')
      .select('reduction_points, active_until')
      .eq('provider_id', provider.id)
      .is('cancelled_at', null)
      .gt('active_until', now)
      .maybeSingle(),
  ])

  const rows = (bookings ?? []) as unknown as BookingRow[]
  const requests = (payoutRequests ?? []) as unknown as PayoutRequest[]
  const completedRows = rows.filter((row) => row.status === 'completed' && row.payment_status === 'captured')

  const grossCollected = rows.reduce((sum, row) => sum + Math.round(Number(row.final_price ?? 0)), 0)
  const completedGross = completedRows.reduce((sum, row) => sum + Math.round(Number(row.final_price ?? 0)), 0)
  const commissionPaid = completedRows.reduce((sum, row) => sum + Math.round(Number(row.commission_amount ?? 0)), 0)
  const netEarned = completedRows.reduce((sum, row) => sum + Math.round(Number(row.provider_payout_amount ?? 0)), 0)
  const processing = requests
    .filter((request) => request.status === 'processing')
    .reduce((sum, request) => sum + Math.round(Number(request.amount ?? 0)), 0)
  const paid = requests
    .filter((request) => request.status === 'paid')
    .reduce((sum, request) => sum + Math.round(Number(request.amount ?? 0)), 0)
  const available = Math.max(0, netEarned - processing - paid)

  const activePackage = plan.packageConfig
  const activeCeilingRate = plan.ceilingRate
  const activeD4D = plan.d4dBonus
  const activeMonthlyFee = Math.round(Number(plan.subscription?.monthly_fee ?? activePackage.monthlyFee))
  const method = payoutMethod as PayoutMethod

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Finance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bookings, commission, payout details, and payout requests.
          </p>
        </div>
        <Link href="/provider-dashboard/bookings" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
          View bookings
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Credits collected" value={formatCredits(grossCollected)} note={`${money(grossCollected)} rand value`} />
        <Metric label="Completed gross" value={money(completedGross)} note={`${completedRows.length} completed booking${completedRows.length === 1 ? '' : 's'}`} />
        <Metric label="Commission paid" value={money(commissionPaid)} note="Platform commission" />
        <Metric label="Net earned" value={money(netEarned)} note="After commission" />
        <Metric label="Available payout" value={money(available)} note={`${money(processing)} in progress`} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Commission package</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Ceiling package" value={`${activePackage.name} (${money(activeMonthlyFee)}/mo)`} />
            <Info label="Ceiling rate" value={activeCeilingRate === null ? 'No cap' : `${(activeCeilingRate * 100).toFixed(1)}%`} />
            <Info label="D4D bonus" value={activeD4D === null ? 'Not available' : `${(activeD4D * 100).toFixed(1)} percentage points`} />
            <Info label="Temporary reduction" value={tempReduction ? `${(Number(tempReduction.reduction_points) * 100).toFixed(1)} points active` : 'None active'} />
          </dl>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Request payout</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Minimum payout is {money(PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT)}.
          </p>
          <form action={requestProviderPayout} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="number"
              name="amount"
              min={PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT}
              max={available}
              step="1"
              placeholder="Amount"
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              disabled={!method || available < PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT}
            />
            <FormSubmitButton pendingLabel="Requesting...">Request payout</FormSubmitButton>
            <textarea
              name="providerNote"
              placeholder="Optional note"
              className="min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
              disabled={!method || available < PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT}
            />
          </form>
          {!method && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Add payout details before requesting a payout.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <PayoutMethodForm method={method} />
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Payout requests</h2>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No payout requests yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {requests.map((request) => (
                <li key={request.id} className="rounded-xl border px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{money(Number(request.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.method === 'payshap' ? 'PayShap' : 'Bank'} · {request.bank_name} · {new Date(request.requested_at).toLocaleDateString('en-ZA')}
                      </p>
                      {request.admin_note && <p className="mt-1 text-xs text-muted-foreground">{request.admin_note}</p>}
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                      {request.status === 'processing' ? 'In progress' : request.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Booking financial breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">List</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3 text-right">Credits / Rand</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Effective rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const service = one(row.service)
                const pkg = one(row.package)
                const customer = one(row.customer)
                const finalPrice = Math.round(Number(row.final_price ?? 0))
                const commission = Math.round(Number(row.commission_amount ?? 0))
                const net = Math.round(Number(row.provider_payout_amount ?? 0))
                const listPrice = Math.round(Number(pkg?.price ?? finalPrice))
                const effectiveRate = finalPrice > 0 ? (commission / finalPrice) * 100 : 0

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link href={`/provider-dashboard/bookings/${row.id}`} className="font-medium hover:underline">
                        {service?.title ?? 'Service'}
                      </Link>
                      <p className="text-xs text-muted-foreground">{pkg?.name ?? 'Package'}</p>
                    </td>
                    <td className="px-4 py-3">{customer?.name ?? 'Customer'}</td>
                    <td className="px-4 py-3 capitalize">{row.status.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3 text-right">{money(listPrice)}</td>
                    <td className="px-4 py-3">{discountText(pkg?.discount_type ?? 'none', pkg?.discount_amount ?? null, listPrice, finalPrice)}</td>
                    <td className="px-4 py-3 text-right">{formatCredits(finalPrice)} / {money(finalPrice)}</td>
                    <td className="px-4 py-3 text-right">{money(commission)}</td>
                    <td className="px-4 py-3 text-right">{money(net)}</td>
                    <td className="px-4 py-3 text-right">{effectiveRate.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}

function PayoutMethodForm({ method }: { method: PayoutMethod }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Payout details</h2>
      <form action={savePayoutMethod} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Payment method</span>
          <select name="method" defaultValue={method?.method ?? 'bank'} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2">
            <option value="bank">Bank account</option>
            <option value="payshap">PayShap</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Name on account</span>
          <input name="nameOnAccount" defaultValue={method?.name_on_account ?? ''} required className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Bank</span>
          <input name="bankName" defaultValue={method?.bank_name ?? ''} required className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Account type</span>
          <input name="accountType" defaultValue={method?.account_type ?? ''} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Account number</span>
          <input name="accountNumber" defaultValue={method?.account_number ?? ''} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Branch code</span>
          <input name="branchCode" defaultValue={method?.branch_code ?? ''} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-xs text-muted-foreground">PayShap cellphone number</span>
          <input name="payshapCellphone" defaultValue={method?.payshap_cellphone ?? ''} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2" />
        </label>
        <div className="sm:col-span-2">
          <FormSubmitButton pendingLabel="Saving...">Save payout details</FormSubmitButton>
        </div>
      </form>
    </div>
  )
}
