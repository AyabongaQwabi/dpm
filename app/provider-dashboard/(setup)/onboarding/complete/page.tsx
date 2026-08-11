import Link from 'next/link'
import { getPackage, PACKAGES } from '@/lib/pricing-config'
import { requireProviderSession } from '@/lib/session'
import { checkSubscriptionUpgraded } from '@/lib/payments/verify-subscription'
import { PaymentPendingNotice } from '@/components/PaymentPendingNotice'

interface OnboardingCompletePageProps {
  searchParams: Promise<{ status?: string; reference?: string; package?: string }>
}

export default async function OnboardingCompletePage({ searchParams }: OnboardingCompletePageProps) {
  const { provider } = await requireProviderSession()
  const params = await searchParams
  const basePlan = PACKAGES[0]

  const isPaidCheckoutReturn = params.status === 'success' && !!params.reference && !!params.package
  let paidConfirmed = false
  if (isPaidCheckoutReturn) {
    paidConfirmed = (await checkSubscriptionUpgraded(params.reference!, provider.id)).renewed
  }

  const packageNumber = params.package ? Number(params.package) : null
  const selectedPlan = packageNumber && packageNumber >= 1 && packageNumber <= 5
    ? getPackage(packageNumber as 1 | 2 | 3 | 4 | 5)
    : basePlan

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {isPaidCheckoutReturn && !paidConfirmed && (
        <div className="mb-6">
          <PaymentPendingNotice />
        </div>
      )}

      <h1 className="font-display text-3xl font-bold text-foreground">You&apos;re all set!</h1>

      {isPaidCheckoutReturn && paidConfirmed ? (
        <p className="mt-3 text-muted-foreground">
          Payment received — you&apos;re on the <strong>{selectedPlan.name} Plan</strong> (R{selectedPlan.monthlyFee}/month).
        </p>
      ) : isPaidCheckoutReturn ? (
        <p className="mt-3 text-muted-foreground">
          Confirming your payment for the <strong>{selectedPlan.name} Plan</strong> (R{selectedPlan.monthlyFee}/month) — this page will update automatically once it&apos;s through.
        </p>
      ) : (
        <p className="mt-3 text-muted-foreground">
          You&apos;re on the <strong>{basePlan.name} Plan</strong> (R{basePlan.monthlyFee}/month).
          Your first billing period starts today — no payment required upfront.
        </p>
      )}

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
