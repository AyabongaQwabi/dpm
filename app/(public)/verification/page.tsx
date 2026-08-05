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
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="rounded-[2rem] border border-slate-200/10 bg-slate-950 p-10 text-white shadow-2xl shadow-slate-950/20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">Trust</p>
        <h1 className="mt-4 text-5xl font-display font-semibold tracking-tight">How verification works</h1>
        <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-300">
          Verification on ServicePros is layered. Providers can hold any combination of four independent badges, and listings highlight the strongest badge they have earned.
        </p>
      </div>

      <section className="mt-12 rounded-[2rem] border border-slate-200/10 bg-white p-8 shadow-xl shadow-slate-900/5">
        <h2 className="text-2xl font-semibold tracking-tight">What the badge order means</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          A listing shows one badge: the strongest badge the provider holds. In order of strength, that is{' '}
          <strong className="text-foreground">FICA</strong>, <strong className="text-foreground">CIPC</strong>, <strong className="text-foreground">Google</strong>, then <strong className="text-foreground">Contact</strong>.
          A stronger badge does not remove weaker signals — it just means the listing leads with the most robust proof available.
        </p>
      </section>

      <section className="mt-12 grid gap-6">
        {TIER_ORDER.map((tier) => {
          const meta = TIER_META[tier]
          const detail = TIER_DETAIL[tier]
          const Glyph = meta.icon
          return (
            <div key={tier} className="rounded-[2rem] border border-slate-200/10 bg-slate-50 p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${meta.className}`}>
                  <Glyph className="h-4 w-4" weight="fill" />
                  {meta.label}
                </span>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-foreground">What the provider submitted</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted-foreground">{detail.submitted}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground">What customers can rely on</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted-foreground">{detail.customerCanRely}</dd>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="mt-12 rounded-[2rem] border border-slate-200/10 bg-muted/30 p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Icon.shield className="h-4 w-4" />
          Unverified listings
        </div>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Unverified listings are still useful, but their details are self-reported. A provider may still be genuine, but ServicePros has not independently confirmed their contact, registration or identity details yet.
        </p>
      </section>

      <section className="mt-12 rounded-[2rem] border border-slate-200/10 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">How providers get verified</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            Contact, CIPC and FICA verification are managed from the provider dashboard. Contact verification confirms the provider&apos;s phone number and email. CIPC verification checks registered business details. FICA verification validates identity and proof of address.
          </p>
          <p>
            Google verification is added automatically when ServicePros matches a profile to an existing Google Places business listing. Providers do not apply for Google verification directly on our platform.
          </p>
        </div>
        <Link
          href="/provider-dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
        >
          Go to your dashboard
          <Icon.arrowRight className="h-4 w-4" weight="bold" />
        </Link>
      </section>

      <section className="mt-12 rounded-[2rem] border border-slate-200/10 bg-slate-50 p-8 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">What verification does and does not guarantee</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Verification confirms specific facts — a phone number, a registered business, or an identity document. It does not guarantee service quality, timeliness, or the exact outcome of the job.
        </p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          If a verified provider misrepresents their work, message them first. If it cannot be resolved,{' '}
          <Link href="/contact" className="text-primary hover:underline">report the problem</Link>{' '}
          and refer to our <Link href="/refund" className="text-primary hover:underline">refund policy</Link>.
        </p>
      </section>
    </main>
  )
}
