import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { getSupportEmail } from '@/lib/policy-content'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'
import { TodoPlaceholder } from '@/components/TodoPlaceholder'

export const metadata: Metadata = {
  title: 'Platform partners',
  description:
    'Sell business services to ServicePros providers through the closed, in-dashboard marketplace — visible to signed-in providers only.',
  alternates: canonicalAlternates('/platform-partners'),
  openGraph: defaultOpenGraph(
    'Platform partners',
    'Sell business services to ServicePros providers through the closed, in-dashboard marketplace.',
    '/platform-partners',
  ),
  twitter: defaultTwitter(
    'Platform partners',
    'Sell business services to ServicePros providers through the closed, in-dashboard marketplace.',
  ),
}

export default async function PlatformPartnersPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main>
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
          <h2 className="font-display text-lg font-semibold">Commercial terms</h2>
          <p className="mt-3">
            <TodoPlaceholder>commercial terms for platform partners aren&apos;t standardised yet — confirm rate structure before publishing</TodoPlaceholder>
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
