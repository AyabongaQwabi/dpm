import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import { loadConfigStore } from '@/lib/config-store'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import type { BookingStatus, PaymentStatus, ProviderPayoutStatus } from '@/lib/db'
import { formatCredits } from '@/lib/format-credits'

const STATUS_LABELS: Record<BookingStatus, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' },
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  captured: 'Credits received',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

const PAYOUT_LABELS: Record<ProviderPayoutStatus, string> = {
  pending: 'Payout pending',
  processing: 'Processing',
  paid: 'Paid',
}

export default async function SalesPage() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const config = await loadConfigStore(supabase)
  const payoutDays = await getConfigNumber(config, CONFIG_KEYS.PROVIDER_PAYOUT_BUSINESS_DAYS)

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, payment_status, final_price, commission_amount, provider_payout_amount, requested_at,
      service:services(id, title),
      customer:customers(id, name, email),
      service_packages(id, name),
      provider_payouts(id, status, net_payout_amount)
    `)
    .eq('provider_id', provider.id)
    .order('requested_at', { ascending: false })
    .limit(100)

  type Row = {
    id: string
    status: BookingStatus
    payment_status: PaymentStatus | null
    final_price: number
    commission_amount: number
    provider_payout_amount: number
    requested_at: string
    service: { id: string; title: string } | { id: string; title: string }[] | null
    customer: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null
    service_packages: { id: string; name: string }[] | null
    provider_payouts: { id: string; status: ProviderPayoutStatus; net_payout_amount: number } | { id: string; status: ProviderPayoutStatus; net_payout_amount: number }[] | null
  }

  const rows = (bookings ?? []) as Row[]

  const totalEarnings = rows
    .filter((b) => b.status === 'completed' && b.payment_status === 'captured')
    .reduce((sum, b) => sum + Number(b.provider_payout_amount), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">My Sales</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recent purchases from customers, most recent first.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total earnings</p>
          <p className="text-2xl font-bold mt-1">{formatCredits(totalEarnings)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">completed & paid</p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total bookings</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold mt-1">
            {rows.filter((b) => b.status === 'completed').length}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No bookings yet. Once customers book your services, they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((booking) => {
            const service = Array.isArray(booking.service) ? booking.service[0] : booking.service
            const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
            const pkg = booking.service_packages?.[0]
            const payout = Array.isArray(booking.provider_payouts)
              ? booking.provider_payouts[0]
              : booking.provider_payouts
            const statusInfo = STATUS_LABELS[booking.status]
            const date = new Date(booking.requested_at).toLocaleDateString('en-ZA', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
            const netPayout = Number(booking.provider_payout_amount)

            return (
              <div
                key={booking.id}
                className="rounded-xl border bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{service?.title ?? 'Service'}</p>
                  {pkg && (
                    <p className="text-xs text-muted-foreground">{pkg.name} package</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {customer?.name ?? 'Customer'} · {date}
                  </p>
                  {payout?.status === 'pending' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Payout of {formatCredits(payout.net_payout_amount)} (R{payout.net_payout_amount.toLocaleString('en-ZA')}) is being processed — you&apos;ll receive it within {payoutDays} business days
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCredits(netPayout)}</p>
                    {booking.payment_status && (
                      <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[booking.payment_status]}</p>
                    )}
                    {payout && (
                      <p className="text-xs text-muted-foreground">{PAYOUT_LABELS[payout.status]}</p>
                    )}
                  </div>
                  <span className={[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    statusInfo.className,
                  ].join(' ')}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
