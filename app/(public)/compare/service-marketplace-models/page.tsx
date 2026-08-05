import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { ComparisonMatrix, COMPARISON_CRITERIA } from '@/components/compare/ComparisonMatrix'
import { ComparisonDisclosure } from '@/components/compare/ComparisonDisclosure'
import { GUIDE_LAST_REVIEWED } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, comparisonPageJsonLd, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

const PATH = '/compare/service-marketplace-models'
const TITLE = 'Service Marketplace Models Compared'
const DESCRIPTION =
  'A neutral guide to service marketplace models — basic directories, pay-per-lead marketplaces, and booking-and-commission marketplaces — and where the ServicePros model fits.'

// Not yet in app/sitemap.ts and deliberately noindex pending legal review — see
// docs/seo/COMPARISON-PAGES-SAFE-STRATEGY.md and the Phase 7 tracker entry.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonicalAlternates(PATH),
  openGraph: defaultOpenGraph(TITLE, DESCRIPTION, PATH),
  twitter: defaultTwitter(TITLE, DESCRIPTION),
  robots: { index: false, follow: false },
}

export default function ServiceMarketplaceModelsPage() {
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
            criteria: COMPARISON_CRITERIA,
          }),
        ]}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Compare</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Service marketplace models compared</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        If you&apos;re trying to work out how local service platforms actually differ, it usually comes down
        to three shapes: basic directories, pay-per-lead marketplaces, and booking-and-commission
        marketplaces. This guide explains each model in neutral terms and shows where ServicePros fits.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Quick comparison</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Use &quot;varies&quot;, &quot;usually&quot;, and &quot;often&quot; as a guide, not a rule — individual
          platforms within each model differ.
        </p>
        <div className="mt-6">
          <ComparisonMatrix />
        </div>
      </section>

      <section className="mt-12 space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">What each model means</h2>

        <div>
          <h3 className="text-lg font-semibold">Basic directory</h3>
          <p className="mt-2 leading-7 text-muted-foreground">
            A directory mainly helps people find listed businesses — a name, a category, contact details.
            It usually doesn&apos;t handle the booking, payment, or review step; customers typically move
            off-platform to actually transact with the business.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Pay-per-lead marketplace</h3>
          <p className="mt-2 leading-7 text-muted-foreground">
            Providers often pay to access or unlock a customer enquiry, sometimes competing with other
            providers for the same lead. The platform typically earns from the enquiry itself, whether or
            not any provider ends up winning the job.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Booking marketplace</h3>
          <p className="mt-2 leading-7 text-muted-foreground">
            Customers can often browse, compare, and book directly on the platform. Providers may pay a
            commission on completed work, a subscription, or a mix of both, depending on the platform.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">ServicePros</h3>
          <p className="mt-2 leading-7 text-muted-foreground">
            ServicePros is a booking-and-commission marketplace: customers browse real provider profiles,
            compare services and reviews, and book using credits. Providers pay a listing subscription and
            commission only on completed, paid work — never for enquiries.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which model suits customers?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          If you want to compare providers, see pricing, and book without leaving the platform, a booking
          marketplace usually gives the most complete picture before you commit. A basic directory can still
          be useful for quick discovery if you&apos;re happy to negotiate details directly with the
          business.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which model suits providers?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Providers who want predictable costs tied to actual work, rather than costs tied to enquiry
          volume, tend to prefer commission-only models. Providers who want maximum enquiry volume
          regardless of conversion may still choose pay-per-lead models, accepting the cost of unconverted
          leads as part of that trade-off.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Questions to ask before choosing a platform</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-muted-foreground">
          <li>Do I pay for enquiries, or only for completed work?</li>
          <li>Can customers book and pay on the platform, or only contact me off-platform?</li>
          <li>What happens to my payment or credits if a booking falls through?</li>
          <li>What verification or trust signals does the platform show customers?</li>
          <li>How are reviews collected, and are they tied to real, completed bookings?</li>
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border bg-card p-6">
        <h2 className="text-2xl font-bold tracking-tight">The ServicePros approach</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          No pay-per-lead fees, commission only on completed and paid work, and a public provider profile
          built for customers to compare before they book. See{' '}
          <Link href="/why-servicepros" className="text-primary hover:underline">why providers choose ServicePros</Link>{' '}
          and what a <Link href="/dpm" className="text-primary hover:underline">Directory and Provider Marketplace</Link>{' '}
          actually is.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
          >
            Find providers
          </Link>
          <Link
            href="/get-listed"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            Get listed
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          See also: <Link href="/services" className="text-primary hover:underline">browse services</Link>,{' '}
          <Link href="/pricing" className="text-primary hover:underline">customer pricing</Link>,{' '}
          <Link href="/verification" className="text-primary hover:underline">verification</Link>, and{' '}
          <Link href="/provider-terms" className="text-primary hover:underline">provider terms</Link>.
        </p>
      </section>

      <ComparisonDisclosure lastUpdated={GUIDE_LAST_REVIEWED} />
    </main>
  )
}
