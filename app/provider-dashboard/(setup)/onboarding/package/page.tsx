// Package selection — shown once, right after the last onboarding step and
// before /onboarding/complete. Starter is free (no payment, ensureBaseSubscription
// only); packages 2-5 route through Yoco checkout via PackageUpgradeButton.
import { redirect } from 'next/navigation'
import { requireProviderSession } from '@/lib/session'
import { PACKAGES } from '@/lib/pricing-config'
import { ensureBaseSubscription } from '@/lib/actions/subscriptions'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'
import { PackageUpgradeButton } from '@/components/provider-dashboard/PackageUpgradeButton'
import { Icon } from '@/components/ui/Icon'

const RETURN_PATH = '/provider-dashboard/onboarding/complete'

export default async function OnboardingPackagePage() {
  const { provider } = await requireProviderSession()

  async function chooseStarter() {
    'use server'
    await ensureBaseSubscription(provider.id)
    redirect(RETURN_PATH)
  }

  const purchasesPaused = isFeaturePaused('purchases')
  const purchasesPausedMessage = getFeaturePauseMessage('purchases')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent mb-3">
            <Icon.sparkle className="w-3.5 h-3.5" weight="fill" />
            Last step
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Choose your plan
          </h1>
          <p className="mt-2 text-muted-foreground text-sm max-w-lg mx-auto">
            Start free, or pick a plan with a lower commission ceiling. You can change this anytime from billing.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((pkg) => {
            const isStarter = pkg.packageNumber === 1
            return (
              <div
                key={pkg.id}
                className={[
                  'relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm',
                  pkg.recommended ? 'border-primary-accent ring-1 ring-primary-accent' : 'border-border',
                ].join(' ')}
              >
                {pkg.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary-accent px-2.5 py-0.5 text-xs font-semibold text-primary-accent-foreground">
                    {pkg.badge}
                  </span>
                )}
                <h2 className="font-display text-lg font-semibold text-foreground">{pkg.name}</h2>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  R{pkg.monthlyFee}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{pkg.tagline}</p>
                {pkg.ceilingRate != null && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Commission ceiling: {(pkg.ceilingRate * 100).toFixed(1)}%
                    {pkg.d4dBonus != null && ` · D4D bonus: ${(pkg.d4dBonus * 100).toFixed(1)}%`}
                  </p>
                )}
                <div className="mt-5 flex-1" />
                {isStarter ? (
                  <form action={chooseStarter}>
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      Start free
                    </button>
                  </form>
                ) : (
                  <PackageUpgradeButton
                    packageNumber={pkg.packageNumber as 2 | 3 | 4 | 5}
                    monthlyFee={pkg.monthlyFee}
                    returnPath={RETURN_PATH}
                    purchasesPaused={purchasesPaused}
                    purchasesPausedMessage={purchasesPausedMessage}
                  />
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prices in ZAR. Commission still applies per booking — plans only change the ceiling rate.
        </p>
      </div>
    </div>
  )
}
