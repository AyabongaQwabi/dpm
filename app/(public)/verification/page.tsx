import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { TIER_META, type VerificationTier } from '@/components/ui/VerifiedBadge'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'How verification works',
  description:
    'What each ServicePros verification badge means, what a provider had to submit or where it came from, and what it does and doesn’t guarantee.',
  alternates: canonicalAlternates('/verification'),
  openGraph: defaultOpenGraph(
    'How verification works',
    'Contact, Google, CIPC, and FICA verification on ServicePros — what each badge means and how to get one.',
    '/verification',
  ),
  twitter: defaultTwitter(
    'How verification works',
    'Contact, Google, CIPC, and FICA verification on ServicePros — what each badge means and how to get one.',
  ),
}

// Priority order, strongest first — mirrors latestTier() in components/ui/VerifiedBadge.tsx.
// That function is the only place this order is defined in code.
const TIER_ORDER: VerificationTier[] = ['fica', 'cipc', 'google', 'contact']

const TIER_DETAIL: Record<
  VerificationTier,
  { submitted: string; customerCanRely: string }
> = {
  contact: {
    submitted: 'Confirmed their cell number and email address.',
    customerCanRely: 'This provider is reachable at the contact details on their profile.',
  },
  google: {
    submitted: 'Nothing — this one isn’t submitted by the provider. It’s imported from Google Places, which confirms the business is real and listed on Google.',
    customerCanRely: 'This business exists and is listed on Google under this name. ServicePros hasn’t independently checked it beyond that.',
  },
  cipc: {
    submitted: 'Verified their registered CIPC business details.',
    customerCanRely: 'This provider is registered with the Companies and Intellectual Property Commission (CIPC) as a real business.',
  },
  fica: {
    submitted: 'Submitted FICA documents — a valid ID and proof of address.',
    customerCanRely: 'This provider’s identity and address have been checked against FICA requirements.',
  },
}

export default function VerificationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Trust</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">How verification works</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
        Verification is layered — a provider can hold any combination of four independent badges.
        Listings show the strongest badge a provider has earned.
      </p>

      {/* Priority order note */}
      <section className="mt-10 rounded-2xl border bg-muted/30 p-6">
        <p className="text-sm leading-6 text-muted-foreground">
          A provider&apos;s listing shows a single badge: the strongest one they hold, in this order —{' '}
          <strong className="text-foreground">FICA</strong>, then{' '}
          <strong className="text-foreground">CIPC</strong>, then{' '}
          <strong className="text-foreground">Google</strong>, then{' '}
          <strong className="text-foreground">Contact</strong>. Holding a stronger badge doesn&apos;t
          remove the weaker ones — it just means the listing leads with the strongest proof available.
          Google verification sits below FICA and CIPC because it&apos;s a real-world signal we import
          from Google, not a check ServicePros performs directly.
        </p>
      </section>

      {/* Tiers */}
      <section className="mt-10 space-y-6">
        {TIER_ORDER.map((tier) => {
          const meta = TIER_META[tier]
          const detail = TIER_DETAIL[tier]
          const Glyph = meta.icon
          return (
            <div key={tier} className="rounded-2xl border bg-card p-6">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${meta.className}`}>
                <Glyph className="h-4 w-4" weight="fill" />
                {meta.label}
              </span>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-foreground">What the provider submitted</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted-foreground">{detail.submitted}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground">What you can rely on</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted-foreground">{detail.customerCanRely}</dd>
                </div>
              </dl>
            </div>
          )
        })}
      </section>

      {/* Unverified */}
      <section className="mt-10 rounded-2xl border bg-muted/30 p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
          <Icon.shield className="h-4 w-4" />
          Unverified
        </span>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Details on this listing are self-reported and the business hasn&apos;t completed verification
          yet. That doesn&apos;t mean the business isn&apos;t genuine — it means we haven&apos;t
          independently confirmed anything on the profile. Reviews from completed bookings are still a
          useful signal on an unverified listing.
        </p>
      </section>

      {/* How to get verified */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">How a provider gets verified</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Contact, CIPC, and FICA verification are managed from the provider dashboard: contact
          verification is confirming your cell number and email; CIPC verification requires your
          registered business details; FICA verification requires a valid ID and proof of address. Google
          verification isn&apos;t something a provider applies for — it&apos;s added automatically when
          ServicePros matches a listing to a business Google Places has confirmed is real.
        </p>
        <Link
          href="/provider-dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
        >
          Go to your dashboard
          <Icon.arrowRight className="h-4 w-4" weight="bold" />
        </Link>
      </section>

      {/* Misrepresentation */}
      <section className="mt-10 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">If a verified provider misrepresents themselves</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A verification badge confirms the specific thing it checks — contact details, a Google listing,
          business registration, or identity — not the quality of the work. If a verified provider misrepresents
          themselves or the service they deliver, message them first to try to resolve it, then{' '}
          <Link href="/contact" className="text-primary hover:underline">report the problem</Link>{' '}
          to us. See our{' '}
          <Link href="/refund" className="text-primary hover:underline">refund policy</Link> for how
          credit refunds work on disputed bookings.
        </p>
      </section>
    </main>
  )
}
