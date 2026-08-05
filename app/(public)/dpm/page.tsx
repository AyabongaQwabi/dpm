import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { StatsBand } from '@/components/about/StatsBand'
import { getCategories, getLocations } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { canonicalAlternates, canonicalUrl, definedTermJsonLd, defaultOpenGraph, defaultTwitter, SITE_NAME, SITE_URL } from '@/lib/seo'

export const revalidate = 3600

const NAMOOTA_URL = 'https://namootatech.com'

const DPM_DEFINITION =
  'A DPM (Directory Provider Maker) is a platform category, coined by Namoota Technology, for software that makes providers rather than simply listing them: it combines discovery, a real business storefront, quoting, payment, reputation and growth mechanics in one engine, structured so the platform only earns when the provider earns.'

export const metadata: Metadata = {
  title: 'What is a DPM? — Directory Provider Maker, defined',
  description: DPM_DEFINITION,
  alternates: canonicalAlternates('/dpm'),
  openGraph: defaultOpenGraph('What is a DPM?', DPM_DEFINITION, '/dpm'),
  twitter: defaultTwitter('What is a DPM?', DPM_DEFINITION),
}

export default async function DpmPage() {
  const supabase = await createClient()
  const [categories, locations] = await Promise.all([getCategories(supabase), getLocations(supabase)])

  const providerCount = categories.reduce((sum, c) => sum + c.providerCount, 0)
  const categoryCount = categories.length
  const cityCount = locations.length

  return (
    <main>
      <JsonLd
        data={[
          definedTermJsonLd({
            path: '/dpm',
            termName: 'DPM (Directory Provider Maker)',
            description: DPM_DEFINITION,
            inDefinedTermSetPath: '/dpm',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'What is a DPM? — Directory Provider Maker, defined',
            description: DPM_DEFINITION,
            url: canonicalUrl('/dpm'),
            author: {
              '@type': 'Organization',
              name: 'Namoota Technology (Pty) Ltd',
              url: NAMOOTA_URL,
            },
            publisher: {
              '@type': 'Organization',
              name: SITE_NAME,
              url: SITE_URL,
            },
          },
        ]}
      />

      {/* Definition block — self-contained, quotable, at the very top */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Definition</p>
          <h1 className="mt-3 text-balance font-display text-4xl font-bold tracking-tight lg:text-5xl">
            What is a DPM?
          </h1>
          <p className="mt-6 max-w-3xl text-balance font-display text-2xl font-semibold leading-snug text-foreground lg:text-3xl">
            {DPM_DEFINITION}
          </p>
        </div>
      </section>

      {/* The problem it names */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">The problem it names</h2>
        <div className="mt-5 space-y-4 text-base leading-7 text-muted-foreground">
          <p>
            A directory lists a business and leaves it there — a name, a number, a dead page. A lead
            marketplace does the opposite: it makes businesses bid and pay to compete for the same
            enquiry, so the platform earns whether or not the provider ever gets paid. Both treat the
            provider as inventory to be listed or auctioned, not as a business to be grown.
          </p>
          <p>
            Neither name describes what a platform does when it takes on the job of actually building the
            provider&apos;s business — that gap is what the term DPM names.
          </p>
        </div>
      </section>

      {/* The three layers — a real sequence, ordered markers are legitimate here */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">The three layers</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The three parts of the name are a real sequence — each layer depends on the one before it.
          </p>
          <ol className="mt-8 space-y-6">
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">1</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Directory — discoverability</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The provider can be found — by category, by city, by search, by an AI assistant citing
                  the listing.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">2</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Provider — the business itself</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Not a listing — a real storefront with services, pricing, a gallery, and reviews tied to
                  paid work.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">3</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Maker — the engine that grows it</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Verification, ranking, payments, and the subscription and commission mechanics that fund
                  it — plus business services the provider can buy to grow further.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* The economic rule */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">The rule that defines the category</p>
        <p className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
          The platform earns only when the provider earns.
        </p>
      </section>

      {/* DPM in practice */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">DPM in practice</h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            ServicePros is the first platform running on the DPM engine — a term we coined, not a claim
            that no one else has ever tried something like it. See{' '}
            <Link href="/about" className="text-primary hover:underline">how ServicePros applies it</Link>{' '}
            in practice.
          </p>
          <div className="mt-8">
            <StatsBand providerCount={providerCount} categoryCount={categoryCount} cityCount={cityCount} />
          </div>
        </div>
      </section>

      {/* Who built it */}
      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Who built it</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Namoota Technology (Pty) Ltd is the South African technology company that built the DPM engine
          and named the category. ServicePros is where it runs first.
        </p>
        <a
          href={NAMOOTA_URL}
          target="_blank"
          rel="noopener"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          namootatech.com
          <Icon.external className="h-4 w-4" />
        </a>
      </section>
    </main>
  )
}
