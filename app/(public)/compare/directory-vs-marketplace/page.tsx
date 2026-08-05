import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { ComparisonDisclosure } from '@/components/compare/ComparisonDisclosure'
import { GUIDE_LAST_REVIEWED } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, comparisonPageJsonLd, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

const PATH = '/compare/directory-vs-marketplace'
const TITLE = 'Directory vs Marketplace for Local Services'
const DESCRIPTION =
  'What separates a business directory from a service marketplace, and where a Directory and Provider Marketplace (DPM) like ServicePros fits between the two.'

const CRITERIA = [
  'Discovery: can you find the business',
  'Comparison: can you compare providers and services',
  'Transaction: can you book and pay on the platform',
  'Trust signals: reviews and verification',
]

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonicalAlternates(PATH),
  openGraph: defaultOpenGraph(TITLE, DESCRIPTION, PATH),
  twitter: defaultTwitter(TITLE, DESCRIPTION),
  robots: { index: false, follow: false },
}

export default function DirectoryVsMarketplacePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Compare', path: '/compare/service-marketplace-models' },
            { name: TITLE, path: PATH },
          ]),
          ...comparisonPageJsonLd({ path: PATH, name: TITLE, description: DESCRIPTION, criteria: CRITERIA }),
        ]}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Compare</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Directory vs marketplace for local services</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        &quot;Directory&quot; and &quot;marketplace&quot; get used loosely, but they describe two different
        jobs. Understanding the difference explains why some platforms feel like a phone book and others
        feel like a full shopping experience.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">What a directory does</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          A directory tells you a business exists. It usually lists a name, category, location, and contact
          details. Discovery is the whole job — once you find a listing, you typically leave the platform
          to actually get in touch and arrange the work.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">What a marketplace does</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          A marketplace lets you transact with the business, not just find it. That usually means comparing
          services and pricing, messaging or booking on the platform, and paying through it — with reviews
          and trust signals built around actual transactions rather than self-reported claims.
        </p>
      </section>

      <section className="mt-12 rounded-2xl border bg-card p-6">
        <h2 className="text-2xl font-bold tracking-tight">What a Directory and Provider Marketplace (DPM) is</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          A Directory and Provider Marketplace combines both: searchable provider profiles for discovery,
          plus the tools to actually compare, book, message, pay, and review — all without leaving the
          platform. Read the full definition on{' '}
          <Link href="/dpm" className="text-primary hover:underline">what is a DPM?</Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which one should you use?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          If you already know exactly who you want to contact, a directory is often enough. If you&apos;re
          comparing multiple providers, want to see pricing upfront, or want a paper trail for the booking
          and payment, a marketplace model — or a DPM specifically — usually serves you better.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">The ServicePros model</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          ServicePros is a DPM: real provider profiles for discovery and comparison, plus booking, credits,
          payment, and reviews from completed jobs — all in one place. See{' '}
          <Link href="/how-it-works" className="text-primary hover:underline">how ServicePros works</Link>{' '}
          end to end.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
          >
            Find providers
          </Link>
          <Link
            href="/dpm"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            What is a DPM?
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          See also: <Link href="/services" className="text-primary hover:underline">browse services</Link>,{' '}
          <Link href="/get-listed" className="text-primary hover:underline">get listed</Link>,{' '}
          <Link href="/pricing" className="text-primary hover:underline">customer pricing</Link>,{' '}
          <Link href="/why-servicepros" className="text-primary hover:underline">why ServicePros</Link>, and{' '}
          <Link href="/verification" className="text-primary hover:underline">verification</Link>.
        </p>
      </section>

      <ComparisonDisclosure lastUpdated={GUIDE_LAST_REVIEWED} />
    </main>
  )
}
