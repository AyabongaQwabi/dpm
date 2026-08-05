import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { getSupportEmail } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, imageObjectJsonLd, PAGE_OG_IMAGES } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Platform partners',
  description:
    'Sell business services to ServicePros providers through the closed, in-dashboard marketplace — visible to signed-in providers only.',
  alternates: canonicalAlternates('/platform-partners'),
  openGraph: defaultOpenGraph(
    'Platform partners',
    'Sell business services to ServicePros providers through the closed, in-dashboard marketplace.',
    '/platform-partners',
    PAGE_OG_IMAGES.platformPartners,
  ),
  twitter: defaultTwitter(
    'Platform partners',
    'Sell business services to ServicePros providers through the closed, in-dashboard marketplace.',
    PAGE_OG_IMAGES.platformPartners,
  ),
}

const commercialTerms = [
  {
    title: 'Paid partner services',
    body: 'Partners set the dashboard price for each approved service. ServicePros keeps a 15% platform fee on completed, paid orders and pays the partner the remaining 85%, less any refunds or chargebacks.',
  },
  {
    title: 'Package perks and coupons',
    body: 'When a provider redeems an included perk, such as a graphic design or social content coupon, the partner is paid the agreed fulfilment rate for that perk. The provider does not pay again unless they request extra work outside the coupon scope.',
  },
  {
    title: 'Scope before publishing',
    body: 'Every partner service needs a clear deliverable, price, turnaround time, revision allowance, and completion rule before it appears in the provider dashboard.',
  },
  {
    title: 'Payouts and review',
    body: 'Partner payouts are released after the order is marked complete or the refund window closes. Launch rates may be reviewed as the marketplace grows, with existing partners notified before changes take effect.',
  },
] as const

export default async function PlatformPartnersPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Platform partners', path: '/platform-partners' },
          ]),
          imageObjectJsonLd(PAGE_OG_IMAGES.platformPartners),
        ]}
      />
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Platform partners</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance lg:text-5xl">
              Sell business services to our providers
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground text-pretty">
              Platform partners offer graphic design, business services, and similar professional
              services to ServicePros providers, through a closed marketplace visible only inside the
              provider dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Snippet-ready answer */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="text-2xl font-bold tracking-tight">What are ServicePros platform partners?</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          ServicePros platform partners provide specialist services to listed providers, such as design,
          marketing, admin, or growth support. Paid partner services use agreed scopes, prices, turnaround
          times, and fulfilment terms before being published on the platform.
        </p>
      </section>

      {/* What a platform partner is, vs provider / referral agent */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Not the same as being a provider or a referral agent</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          This gets confused constantly, so it&apos;s worth being clear about it first.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">A provider</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lists their own services on ServicePros and gets booked by customers directly. See{' '}
              <Link href="/get-listed" className="text-primary hover:underline">get listed</Link>.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">A referral agent</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Refers providers to sign up on ServicePros and earns a share of their subscription. See{' '}
              <Link href="/referral-agents" className="text-primary hover:underline">referral agents</Link>.
            </p>
          </div>
          <div className="rounded-2xl border border-primary-accent/40 bg-primary-accent/5 p-6">
            <h3 className="font-display text-lg font-semibold">A platform partner</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sells their own business services — design, compliance, strategy, and similar — directly to
              ServicePros providers, through the closed marketplace below.
            </p>
          </div>
        </div>
      </section>

      {/* The closed marketplace */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">The closed marketplace</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            The platform partners marketplace is visible only to signed-in providers, inside their
            dashboard. It&apos;s not a public listing and it&apos;s not indexed or searchable outside
            ServicePros — providers browse it the same way they&apos;d browse any other in-dashboard tool.
          </p>
        </div>
      </section>

      {/* AI discovery selling point */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Help providers get found</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Partners can help providers improve the completeness and clarity of their ServicePros profiles,
          including service descriptions, images, portfolios, and other public content that supports search
          and AI discovery. We cannot promise rankings or AI citations, but a more complete profile gives
          providers a stronger public footprint.
        </p>
      </section>

      {/* The constraint */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">The constraint</p>
        <p className="mt-4 text-balance font-display text-2xl font-bold leading-tight tracking-tight text-foreground lg:text-3xl">
          Platform partners sell business services to providers. Never leads, enquiries, or customer contact details.
        </p>
        <p className="mt-4 max-w-2xl mx-auto text-sm leading-6 text-muted-foreground">
          It&apos;s the same golden rule that governs the rest of ServicePros, applied to partners: the
          marketplace connects providers with services that help them run their business, not with access
          to customers or their data.
        </p>
      </section>

      {/* Commercial terms */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Commercial terms</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">How partner services are paid</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            The launch terms keep the model simple: partners earn from completed work, providers see the
            full price before buying, and ServicePros takes a small platform fee for the dashboard,
            payments, support and marketplace access.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {commercialTerms.map((term) => (
              <div key={term.title} className="rounded-lg border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-foreground">{term.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{term.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Final partner agreements can include service-specific rates where a custom fulfilment cost is
            required, but the public marketplace rule is standard: 85% to the partner, 15% to ServicePros
            on completed paid orders.
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
          <li>Your business name and the services you offer.</li>
          <li>Your target market and typical pricing.</li>
          <li>Any relevant experience serving small businesses or service providers.</li>
        </ul>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent('Platform partner application')}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
        >
          Email your application
          <Icon.arrowRight className="h-4 w-4" weight="bold" />
        </a>
      </section>
    </main>
  )
}
