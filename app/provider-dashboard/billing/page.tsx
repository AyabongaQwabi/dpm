import Link from 'next/link'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { PACKAGES } from '@/lib/pricing-config'
import { daysRemaining, getPackageByNumber } from '@/lib/domain/subscriptions'
import { BillingRenewButton } from '@/components/provider-dashboard/BillingRenewButton'
import { PackageUpgradeButton } from '@/components/provider-dashboard/PackageUpgradeButton'
import { PaymentPendingNotice } from '@/components/PaymentPendingNotice'
import {
  checkSubscriptionRenewed,
  checkSubscriptionUpgraded,
  getProviderAuthEmail,
} from '@/lib/payments/verify-subscription'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'

interface BillingPageProps {
  searchParams: Promise<{ status?: string; reference?: string; package?: string }>
}

export default async function ProviderBillingPage({ searchParams }: BillingPageProps) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const params = await searchParams

  const reference = params.reference
  const isUpgradeReturn = params.status === 'success' && !!reference && !!params.package
  let renewed = false
  let upgraded = false
  if (params.status === 'success' && reference) {
    if (isUpgradeReturn) {
      upgraded = (await checkSubscriptionUpgraded(reference, provider.id)).renewed
    } else {
      renewed = (await checkSubscriptionRenewed(reference, provider.id)).renewed
    }
  }

  const { data: subscription } = await supabase
    .from('provider_subscriptions')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const pkg = getPackageByNumber(subscription?.package_number ?? 1)
  const remaining = subscription ? daysRemaining(subscription.billing_end) : 0
  const isExpired = subscription?.status === 'expired'
  const isActive = subscription?.status === 'active'
  const providerEmail = (await getProviderAuthEmail(provider.id)) ?? ''

  const upgradePackages = PACKAGES.filter((p) => p.packageNumber > 1)

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your subscription and commission plan.</p>
      </div>

      {params.status === 'success' && reference && (renewed || upgraded) && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          Payment received — your subscription has been updated.
        </div>
      )}

      {params.status === 'success' && reference && !renewed && !upgraded && <PaymentPendingNotice />}

      {isExpired && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4">
          <p className="font-semibold text-foreground">Your subscription has expired</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Renew to keep your profile live and continue receiving bookings.
          </p>
          <div className="mt-4">
            <BillingRenewButton
              subscription={subscription}
              providerEmail={providerEmail}
              purchasesPaused={isFeaturePaused('purchases')}
              purchasesPausedMessage={getFeaturePauseMessage('purchases')}
            />
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Current plan</h2>
        {subscription ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-foreground">
              <span className="font-semibold">{pkg.name}</span>
              {' — '}
              R{Number(subscription.monthly_fee).toFixed(0)}/month
            </p>
            <p className="text-muted-foreground">
              Started {new Date(subscription.billing_start).toLocaleDateString('en-ZA')}
              {' · '}
              {isActive
                ? `Renews ${new Date(subscription.billing_end).toLocaleDateString('en-ZA')}`
                : `Expired ${new Date(subscription.billing_end).toLocaleDateString('en-ZA')}`}
            </p>
            <p>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {subscription.status === 'active' ? 'Active' : 'Expired'}
              </span>
              {isActive && (
                <span className="ml-2 text-muted-foreground">{remaining} days remaining</span>
              )}
            </p>
            {isActive && remaining <= 3 && (
              <div className="pt-2">
                <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                  Renews in {remaining} day{remaining === 1 ? '' : 's'}
                </p>
                <BillingRenewButton
              subscription={subscription}
              providerEmail={providerEmail}
              purchasesPaused={isFeaturePaused('purchases')}
              purchasesPausedMessage={getFeaturePauseMessage('purchases')}
            />
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No subscription on file yet.</p>
        )}
      </section>

      {pkg.packageNumber === 1 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Upgrade your plan</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Unlock lower commission ceilings and discount bonuses.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {upgradePackages.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold text-foreground">{plan.name}</h3>
                  {plan.badge && (
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5">{plan.badge}</span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">R{plan.monthlyFee}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                {plan.ceilingRate != null && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Commission ceiling: {(plan.ceilingRate * 100).toFixed(1)}%
                    {plan.d4dBonus != null && ` · D4D bonus: ${(plan.d4dBonus * 100).toFixed(1)}%`}
                  </p>
                )}
                <div className="mt-4">
                  <PackageUpgradeButton
                    packageNumber={plan.packageNumber as 2 | 3 | 4 | 5}
                    monthlyFee={plan.monthlyFee}
                    returnPath="/provider-dashboard/billing"
                    purchasesPaused={isFeaturePaused('purchases')}
                    purchasesPausedMessage={getFeaturePauseMessage('purchases')}
                    label="Upgrade to this plan"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Questions? <Link href="/about" className="underline hover:text-foreground">Contact support</Link>
      </p>
    </div>
  )
}
