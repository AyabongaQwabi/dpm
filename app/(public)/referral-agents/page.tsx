import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { getSupportEmail } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Referral agent programme',
  description:
    'Earn a share of subscription revenue for providers you refer to ServicePros — 35% of active months, for up to 6 months per provider.',
  alternates: canonicalAlternates('/referral-agents'),
  openGraph: defaultOpenGraph(
    'Referral agent programme',
    'Earn a share of subscription revenue for providers you refer to ServicePros — 35% of active months, up to 6 months per provider.',
    '/referral-agents',
  ),
  twitter: defaultTwitter(
    'Referral agent programme',
    'Earn a share of subscription revenue for providers you refer to ServicePros — 35% of active months, up to 6 months per provider.',
  ),
}

const TERMS = [
  {
    title: '35% of subscription revenue',
    body: 'You earn 35% of the monthly subscription fee for every provider you refer, for as long as they keep paying.',
  },
  {
    title: 'Active months only',
    body: "No payment for a month the provider didn't pay. If their subscription lapses, your earnings for that month lapse with it.",
  },
  {
    title: 'Locked at the package they signed up on',
    body: 'Your share is calculated on the monthly fee of the package the provider chose at signup — it stays locked to that package.',
  },
  {
    title: 'Maximum 6 active months per referred provider',
    body: "Earnings on a single referred provider stop after 6 active months. This is a 6-month earning window, not an ongoing annuity — worth knowing up front so it doesn't surprise you later.",
  },
] as const

export default async function ReferralAgentsPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Referral agents', path: '/referral-agents' },
        ])}
      />
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Referral agents</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance lg:text-5xl">
              Refer providers, earn a share of what they pay
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground text-pretty">
              If you know service providers who&apos;d do well on ServicePros, refer them and earn a
              percentage of their subscription for as long as they stay active — up to 6 months per
              provider.
            </p>
          </div>
        </div>
      </section>

      {/* What an agent does */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">What a referral agent does</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              You introduce a service provider to ServicePros using your unique referral link. If they
              sign up and subscribe, you earn a share of their monthly subscription fee for as long as
              they stay paying and active, up to the 6-month cap.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Who it suits</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              People already talking to service providers day to day — business consultants, industry
              association contacts, community organisers, or anyone with a network of tradespeople and
              small business owners who&apos;d benefit from being listed.
            </p>
          </div>
        </div>
      </section>

      {/* How tracking + payment works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">How tracking and payment work</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Once approved, you get a referral link. Every provider who signs up through it is attributed
            to you. Each month their subscription payment is captured, your share is calculated and paid
            out — there&apos;s nothing to invoice or chase.
          </p>
        </div>
      </section>

      {/* Terms */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Terms, standardised across all agents</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {TERMS.map((term) => (
            <div key={term.title} className="rounded-2xl border bg-card p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon.confetti className="h-6 w-6" weight="duotone" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{term.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{term.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest ceiling */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="font-display text-lg font-semibold">A 6-month window, not an annuity</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Earnings on any single referred provider stop after 6 active months, whether or not they stay
            subscribed after that. If you refer steadily, your total earnings grow with your pipeline of
            new referrals — but no single referral pays out indefinitely. We&apos;d rather you know that
            now than be surprised by it later.
          </p>
        </div>
      </section>

      {/* Application */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Apply</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Email{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>{' '}
          with the following:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-6 text-muted-foreground">
          <li>Your name and contact details.</li>
          <li>A short description of your network — who you know and how you&apos;d refer them.</li>
          <li>Any relevant experience referring or introducing services or products.</li>
        </ul>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent('Referral agent application')}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
        >
          Email your application
          <Icon.arrowRight className="h-4 w-4" weight="bold" />
        </a>
        <p className="mt-6 text-sm text-muted-foreground">
          Want to sell services to providers instead of referring them? See our{' '}
          <Link href="/platform-partners" className="text-primary hover:underline">platform partners</Link>{' '}
          programme.
        </p>
      </section>
    </main>
  )
}
