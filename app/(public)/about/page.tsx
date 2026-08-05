import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { TransformationGraphic } from '@/components/about/TransformationGraphic'
import { MoneyFlowDiagram } from '@/components/about/MoneyFlowDiagram'
import { StatsBand } from '@/components/about/StatsBand'
import { getCategories, getLocations } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { canonicalAlternates, canonicalUrl, defaultOpenGraph, defaultTwitter, SITE_NAME, SITE_URL } from '@/lib/seo'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'

export const revalidate = 3600

const NAMOOTA_URL = 'https://namootatech.com'

export const metadata: Metadata = {
  title: 'What is a DPM? — About ServicePros',
  description:
    'ServicePros is a DPM — a Directory & Provider Marketplace where customers can find, book, pay and review trusted South African providers in one place.',
  alternates: canonicalAlternates('/about'),
  openGraph: defaultOpenGraph(
    'What is a DPM? — About ServicePros',
    'ServicePros is a DPM — a Directory & Provider Marketplace for finding, booking and reviewing trusted providers.',
    '/about',
  ),
  twitter: defaultTwitter(
    'What is a DPM? — About ServicePros',
    'ServicePros is a DPM — a Directory & Provider Marketplace for finding, booking and reviewing trusted providers.',
  ),
}

export default async function AboutPage() {
  const supabase = await createClient()
  const [categories, locations] = await Promise.all([getCategories(supabase), getLocations(supabase)])

  const providerCount = categories.reduce((sum, c) => sum + c.providerCount, 0)
  const categoryCount = categories.length
  const cityCount = locations.length

  const signupPaused = isFeaturePaused('signUp')

  return (
    <main>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'About ServicePros',
            url: canonicalUrl('/about'),
            description:
              'ServicePros is a DPM — a Directory and Provider Marketplace where customers can find, book, pay and review trusted South African providers in one place.',
            isPartOf: {
              '@type': 'WebSite',
              name: SITE_NAME,
              url: SITE_URL,
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Namoota Technology (Pty) Ltd',
            url: NAMOOTA_URL,
            sameAs: [NAMOOTA_URL],
            foundingDate: '2024-08-26',
            address: {
              '@type': 'PostalAddress',
              streetAddress: '152 Company Street, Muckleneuk',
              addressLocality: 'Pretoria',
              addressRegion: 'Gauteng',
              postalCode: '0002',
              addressCountry: 'ZA',
            },
            founder: [
              { '@type': 'Person', name: 'Zweli Mthethwa' },
              { '@type': 'Person', name: 'Ayabonga Qwabi' },
            ],
            makesOffer: {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: SITE_NAME,
                url: SITE_URL,
              },
            },
          },
        ]}
      />

      {/* Hero — the thesis, not a big number */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <p className="reveal text-sm font-semibold uppercase tracking-wide text-primary-accent">About</p>
          <h1 className="reveal reveal-delay-1 mt-3 max-w-3xl text-balance font-display text-4xl font-bold tracking-tight lg:text-5xl">
            ServicePros isn&rsquo;t a directory. It&rsquo;s a DPM.
          </h1>
          <p className="reveal reveal-delay-2 mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
            A DPM — Directory &amp; Provider Marketplace — lets customers find a business the way they
            would use a directory, then book, pay and review the way they would use a marketplace. One
            place instead of two. See the full{' '}
            <Link href="/dpm" className="text-primary hover:underline">definition of a DPM</Link>.
          </p>

          <div className="reveal reveal-delay-3 mt-12">
            <TransformationGraphic />
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">The problem with what came before</h2>
        <div className="mt-5 space-y-4 text-base leading-7 text-muted-foreground">
          <p>
            A directory lists a business and leaves it there — a name, a number, a dead page. A lead marketplace
            does the opposite: it makes businesses bid and pay to compete for the same enquiry, so the platform
            wins whether or not the provider ever gets paid. Both treat the provider as inventory.
          </p>
          <p>
            A DPM connects discovery to the actual transaction: real profiles, clear services, booking,
            payment and reviews tied to completed work.
          </p>
        </div>
      </section>

      {/* The golden rule — most vertical room */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">The golden rule</p>
        <p className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
          Providers never pay to compete for leads. Commission is charged only on completed, paid work.
        </p>
        <div className="mt-10">
          <MoneyFlowDiagram />
        </div>
      </section>

      {/* Live stats */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
        <StatsBand providerCount={providerCount} categoryCount={categoryCount} cityCount={cityCount} />
        </div>
      </section>

      {/* Namoota — compact */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Built by Namoota Technology</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              Namoota Technology (Pty) Ltd built the DPM engine and ServicePros is the first platform deployed on it.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Namoota Technology (Pty) Ltd · Reg. 2024/529614/07 · 152 Company Street, Muckleneuk, Pretoria, Gauteng, 0002
            </p>
          </div>
          <a
            href={NAMOOTA_URL}
            target="_blank"
            rel="noopener"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            namootatech.com
            <Icon.external className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Closing CTA — compact */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">See it from either side</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              Providers get a real presence, not a listing. Customers get real profiles, not adverts.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Link
              href="/get-listed"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
            >
              List your business
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/25 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Find a provider
            </Link>
          </div>
        </div>
        {signupPaused && (
          <div className="mx-auto max-w-7xl px-4 pb-8">
            <p className="text-xs text-primary-foreground/70">{getFeaturePauseMessage('signUp')}</p>
          </div>
        )}
      </section>
    </main>
  )
}
