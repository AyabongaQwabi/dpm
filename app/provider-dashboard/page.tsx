import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import { ServicesNudge } from '@/components/provider-dashboard/ServicesNudge'
import { daysRemaining, getPackageByNumber } from '@/lib/domain/subscriptions'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

export default async function ProviderDashboardHome() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('provider_subscriptions')
    .select('package_number, billing_end, status')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const pkg = getPackageByNumber(subscription?.package_number ?? 1)
  const remaining = subscription ? daysRemaining(subscription.billing_end) : null
  const billingWarning =
    subscription?.status === 'expired'
    || (subscription?.status === 'active' && remaining !== null && remaining <= 3)

  const { count: serviceCount } = await supabase
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)

  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)

  const { count: messageCount } = await supabase
    .from('message_threads')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)

  const hasServices = (serviceCount ?? 0) > 0

  return (
    <div>
      {/* Post-onboarding nudge — client component, dismissible */}
      <ServicesNudge hasServices={hasServices} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Provider dashboard</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {provider.business_name || 'there'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {provider.is_published ? 'Your profile is live.' : 'Your profile is not yet published.'}
          </p>
        </div>

        <Link
          href="/provider-dashboard/billing"
          className={`mb-6 block rounded-2xl border px-5 py-4 shadow-sm transition-colors hover:bg-accent/20 ${
            billingWarning ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-card'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{pkg.name} plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subscription
                  ? subscription.status === 'expired'
                    ? 'Subscription expired — renew to stay visible'
                    : `${remaining} days until renewal`
                  : 'Set up billing'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-accent">
              Billing
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/provider-dashboard/services"
            className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-accent/30"
          >
            <p className="text-2xl font-bold">{serviceCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Services</p>
          </Link>
          <Link
            href="/provider-dashboard/sales"
            className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-accent/30"
          >
            <p className="text-2xl font-bold">{bookingCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Bookings</p>
          </Link>
          <Link
            href="/provider-dashboard/messages"
            className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-accent/30"
          >
            <p className="text-2xl font-bold">{messageCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Conversations</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
