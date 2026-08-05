import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { ComparisonDisclosure } from '@/components/compare/ComparisonDisclosure'
import { GUIDE_LAST_REVIEWED } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, comparisonPageJsonLd, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

const PATH = '/compare/how-to-compare-service-platforms'
const TITLE = 'How to Compare Service Provider Platforms'
const DESCRIPTION =
  'Neutral criteria for comparing any service provider platform: profile visibility, booking flow, pricing transparency, payment handling, refund rules, verification signals, reviews, and support.'

const CRITERIA = [
  { title: 'Visible provider profile', body: 'Can you see a provider’s services, past work, and details before contacting them, or is it a bare listing?' },
  { title: 'Reviews', body: 'Are reviews tied to real, completed bookings, or can anyone post one regardless of whether they used the provider?' },
  { title: 'Service/package pricing', body: 'Is pricing published upfront, or do you have to request a quote before knowing what anything costs?' },
  { title: 'Messaging', body: 'Can you message a provider directly on the platform, or only via external contact details?' },
  { title: 'Payment handling', body: 'Does the platform handle payment, or is that negotiated privately once you’re off-platform?' },
  { title: 'Refund rules', body: 'What happens to your money if a booking is cancelled or a provider doesn’t deliver?' },
  { title: 'Verification signals', body: 'What, if anything, has the platform actually checked about a provider — identity, business registration, contact details?' },
  { title: 'Support/contact clarity', body: 'Is it clear who to contact if something goes wrong, and how they typically respond?' },
]

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonicalAlternates(PATH),
  openGraph: defaultOpenGraph(TITLE, DESCRIPTION, PATH),
  twitter: defaultTwitter(TITLE, DESCRIPTION),
  robots: { index: false, follow: false },
}

export default function HowToCompareServicePlatformsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Compare', path: '/compare/service-marketplace-models' },
            { name: TITLE, path: PATH },
          ]),
          ...comparisonPageJsonLd({
            path: PATH,
            name: TITLE,
            description: DESCRIPTION,
            criteria: CRITERIA.map((c) => c.title),
          }),
        ]}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Compare</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">How to compare service provider platforms</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        Whichever platform you&apos;re looking at — including ServicePros — the same handful of questions
        tell you most of what you need to know before you commit. This guide walks through them one at a
        time.
      </p>

      <section className="mt-12 space-y-8">
        {CRITERIA.map((item) => (
          <div key={item.title}>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which criteria matter most for customers?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          If you&apos;re booking a service you haven&apos;t used before, reviews and verification signals
          matter most — they&apos;re your main proxy for trust before you&apos;ve worked with someone. If
          you&apos;re price-sensitive, published package pricing saves you the back-and-forth of requesting
          quotes from multiple providers.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which criteria matter most for providers?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Providers evaluating a platform to list on should focus on payment handling and refund rules —
          these determine how predictable your cash flow is — alongside whatever fee model the platform
          uses. See our{' '}
          <Link href="/compare/provider-fee-models" className="text-primary hover:underline">
            provider fee models guide
          </Link>{' '}
          for more on that.
        </p>
      </section>

      <section className="mt-12 rounded-2xl border bg-card p-6">
        <h2 className="text-2xl font-bold tracking-tight">How ServicePros stacks up on these criteria</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Public provider profiles with services and packages, reviews tied to completed bookings, published
          pricing where providers choose to publish it, in-platform messaging and payment via credits, a
          documented <Link href="/refund" className="text-primary hover:underline">refund policy</Link>, and{' '}
          <Link href="/verification" className="text-primary hover:underline">Contact, Google, CIPC, and FICA verification signals</Link>{' '}
          where a provider has completed them.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
          >
            Find providers
          </Link>
          <Link
            href="/compare/directory-vs-marketplace"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            Directory vs marketplace
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          See also: <Link href="/dpm" className="text-primary hover:underline">what a DPM is</Link>,{' '}
          <Link href="/services" className="text-primary hover:underline">browse services</Link>,{' '}
          <Link href="/pricing" className="text-primary hover:underline">customer pricing</Link>, and{' '}
          <Link href="/get-listed" className="text-primary hover:underline">get listed</Link>.
        </p>
      </section>

      <ComparisonDisclosure lastUpdated={GUIDE_LAST_REVIEWED} />
    </main>
  )
}
