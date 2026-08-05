import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { TransformationGraphic } from '@/components/about/TransformationGraphic'
import { MoneyFlowDiagram } from '@/components/about/MoneyFlowDiagram'
import { StatsBand } from '@/components/about/StatsBand'
import { getCategories, getLocations } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbJsonLd, canonicalAlternates, canonicalUrl, defaultOpenGraph, defaultTwitter, SITE_NAME, SITE_URL } from '@/lib/seo'
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
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
          ]),
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

      <section className="border-b bg-slate-950/95 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-24">
          <div className="h-1 w-24 rounded-full bg-primary-accent/90" />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">About ServicePros</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-display font-semibold tracking-tight leading-tight">
            A premium DPM for trusted providers and confident customers.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-9 text-slate-300">
            ServicePros brings discovery, booking, payment and verification into one refined experience.
            Providers get a living business presence. Customers get real profiles, clear pricing and work
            that can be completed, paid and reviewed with confidence.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary-accent">Real business presence</p>
            <p className="mt-4 text-base leading-7 text-slate-200">
              Every provider page is more than a listing. It is a service catalog, gallery, review hub and verification profile.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary-accent">Transaction continuity</p>
            <p className="mt-4 text-base leading-7 text-slate-200">
              Customers book actual services. Providers only pay commission when a job is completed and paid.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary-accent">Trust and verification</p>
            <p className="mt-4 text-base leading-7 text-slate-200">
              Verification signals are visible on profiles, so customers can choose based on proof, not promises.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/95 p-12 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">How the platform behaves</p>
          <div className="mt-6 space-y-6 text-lg leading-8 text-slate-300">
            <p>
              ServicePros does not sell visibility. It gives providers a premium place to show their work,
              and it gives customers an easy way to find, book and pay a local provider without the noise of
              bid-style lead marketplaces.
            </p>
            <p>
              Every customer action is connected to the job. A booking starts with a provider service page,
              proceeds through a secured payment path, and ends with a review that reflects real, paid work.
            </p>
            <p>
              That means the platform is built around completed outcomes, not pageviews or enquiries.
              Providers benefit from discovery and actual bookings. Customers benefit from verified vendors,
              clear pricing, and a calm purchase path.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-slate-950/95 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-900/80 p-6 ring-1 ring-white/10">
            <p className="text-5xl font-display font-semibold tracking-tight">{providerCount.toLocaleString()}</p>
            <p className="mt-3 text-sm uppercase tracking-[0.24em] text-slate-400">Providers live on ServicePros</p>
          </div>
          <div className="rounded-3xl bg-slate-900/80 p-6 ring-1 ring-white/10">
            <p className="text-5xl font-display font-semibold tracking-tight">{categoryCount}</p>
            <p className="mt-3 text-sm uppercase tracking-[0.24em] text-slate-400">Service categories</p>
          </div>
          <div className="rounded-3xl bg-slate-900/80 p-6 ring-1 ring-white/10">
            <p className="text-5xl font-display font-semibold tracking-tight">{cityCount}</p>
            <p className="mt-3 text-sm uppercase tracking-[0.24em] text-slate-400">Cities served</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(260px,1fr)_minmax(380px,1.4fr)] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">Built by</p>
              <h2 className="mt-4 text-3xl font-display font-semibold tracking-tight text-white">Namoota Technology</h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-slate-300">
              <p>
                ServicePros is the first platform built on Namoota Technology&apos;s DPM engine — designed to make provider profiles, bookings and verification feel premium, intuitive and trustworthy.
              </p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Namoota Technology (Pty) Ltd · Reg. 2024/529614/07 · 152 Company Street, Muckleneuk, Pretoria, Gauteng, 0002
              </p>
              <a
                href={NAMOOTA_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-accent hover:text-primary"
              >
                namootatech.com
                <Icon.external className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">See the difference in every step.</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              One platform for discovery, booking, payment and review — built for trusted local providers.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Link
              href="/get-listed"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
            >
              Get listed
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
