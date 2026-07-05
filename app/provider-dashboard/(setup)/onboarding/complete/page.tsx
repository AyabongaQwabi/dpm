import Link from 'next/link'
import { PACKAGES } from '@/lib/pricing-config'
import { requireProviderSession } from '@/lib/session'

export default async function OnboardingCompletePage() {
  await requireProviderSession()
  const basePlan = PACKAGES[0]

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-bold text-foreground">You&apos;re all set!</h1>
      <p className="mt-3 text-muted-foreground">
        You&apos;re on the <strong>{basePlan.name} Plan</strong> (R{basePlan.monthlyFee}/month).
        Your first billing period starts today — no payment required upfront.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Want lower commission rates? Compare ceiling packages on your billing page.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/provider-dashboard/billing"
          className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
        >
          View packages
        </Link>
        <Link
          href="/provider-dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
