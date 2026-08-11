import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConfigJsonArray } from '@/lib/config-store'
import { loadPlatformConfig } from '@/lib/platform-config'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import { getActivePromotion } from '@/lib/credit-promotions'
import { CreditPackCards } from '@/components/credits/CreditPackCards'
import { CreditPricingCalculator } from '@/components/credits/CreditPricingCalculator'
import { Icon } from '@/components/ui/Icon'
import { JsonLd } from '@/components/seo/JsonLd'
import { GUIDE_LAST_REVIEWED } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, imageObjectJsonLd, offerCatalogJsonLd, PAGE_OG_IMAGES } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Credits and pricing for ServicePros bookings',
  description:
    'Buy credits to pay for services on ServicePros. 1 credit equals R1. No subscription — top up anytime and spend on any booking.',
  alternates: canonicalAlternates('/pricing'),
  openGraph: defaultOpenGraph(
    'Credits and pricing for ServicePros bookings',
    'Buy credits to pay for services on ServicePros. 1 credit equals R1. No subscription — top up anytime.',
    '/pricing',
    PAGE_OG_IMAGES.pricing,
  ),
  twitter: defaultTwitter(
    'Credits and pricing for ServicePros bookings',
    'Buy credits to pay for services on ServicePros. 1 credit equals R1. No subscription — top up anytime.',
    PAGE_OG_IMAGES.pricing,
  ),
}

const HOW_IT_WORKS = [
  'Buy credits in Rands — each credit is worth R1 on the platform.',
  'Spend credits when you book a service with any provider.',
  'If a booking is cancelled before work begins, credits return to your wallet.',
  'Credits never expire — use them whenever you are ready.',
]

const FAQS = [
  {
    q: 'Do credits expire?',
    a: 'No. Credits stay in your wallet until you use them on a booking.',
  },
  {
    q: 'Can I get a cash refund?',
    a: 'Credit purchases are non-refundable as cash. If a booking is cancelled while still in requested status, credits are returned to your wallet — not to your bank card.',
  },
  {
    q: 'Can I transfer credits to someone else?',
    a: 'No. Credits are tied to your account and cannot be transferred.',
  },
  {
    q: 'What if I do not have enough credits at checkout?',
    a: 'You will be prompted to top up before completing the booking. You can also add credits anytime from your account dashboard.',
  },
]

export default async function CustomerPricingPage() {
  const supabase = await createClient()
  const [{ data: { user } }, config] = await Promise.all([
    supabase.auth.getUser(),
    loadPlatformConfig(),
  ])

  const [packs, minAmount, maxAmount] = await Promise.all([
    getConfigJsonArray(config, CONFIG_KEYS.CREDIT_PACK_DENOMINATIONS),
    getConfigNumber(config, CONFIG_KEYS.CREDIT_PURCHASE_MIN),
    getConfigNumber(config, CONFIG_KEYS.CREDIT_PURCHASE_MAX),
  ])

  let isAuthenticated = false
  if (user) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_provider_id', user.id)
      .maybeSingle()
    isAuthenticated = Boolean(customer)
  }

  const activePromotion = getActivePromotion()

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
          offerCatalogJsonLd({
            name: 'ServicePros credit packs',
            path: '/pricing',
            offers: packs.map((pack) => ({
              name: `${Number(pack).toLocaleString('en-ZA')} ServicePros credits`,
              description: `Credits used to pay for bookings on ServicePros. 1 credit equals R1.`,
              price: Number(pack),
              priceCurrency: 'ZAR',
              url: '/pricing',
            })),
          }),
          imageObjectJsonLd(PAGE_OG_IMAGES.pricing),
        ]}
      />
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">For customers</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance lg:text-5xl">
              Pay for services with credits
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground text-pretty">
              Credits are how you pay for bookings on Service Pros. One credit equals one Rand — buy what you
              need, spend on any service, and top up anytime. No subscription required.
            </p>
            {activePromotion && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary-accent/30 bg-primary-accent/10 px-4 py-2 text-sm font-medium text-primary-accent">
                <Icon.sparkle className="h-4 w-4" weight="fill" />
                {activePromotion.description}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="text-2xl font-bold tracking-tight">How ServicePros credits work</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          ServicePros credits are used to pay for bookings. One credit equals R1. Customers buy credits,
          spend them on services, and receive credits back if an eligible booking is cancelled before work
          begins. Credits do not expire and can be topped up anytime.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Credit packs</h2>
          <p className="mt-2 text-muted-foreground">
            Choose a quick top-up or enter a custom amount below. You only pay for base credits — any bonus is free.
          </p>
        </div>
        <CreditPackCards
          packs={packs}
          activePromotion={activePromotion}
          isAuthenticated={isAuthenticated}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <CreditPricingCalculator
          minAmount={minAmount}
          maxAmount={maxAmount}
          activePromotion={activePromotion}
          isAuthenticated={isAuthenticated}
        />
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">How credits work</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl border bg-card p-5 text-sm leading-6 text-muted-foreground">
                <Icon.verified className="mt-0.5 h-5 w-5 shrink-0 text-primary-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="mt-8 divide-y rounded-2xl border overflow-hidden">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group bg-card">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold select-none list-none hover:bg-muted/30">
                {faq.q}
                <span className="shrink-0 transition-transform duration-200 group-open:rotate-45 text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          For full refund details, see our{' '}
          <Link href="/refund" className="text-primary hover:underline">refund policy</Link>.
        </p>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ready to book a service?</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              {isAuthenticated
                ? 'Top up your wallet and browse providers near you.'
                : 'Create an account, buy credits, and book with confidence.'}
            </p>
          </div>
          <Link
            href={isAuthenticated ? '/customer-account/credits' : '/sign-up'}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            {isAuthenticated ? 'Go to wallet' : 'Get started'}
            <Icon.arrowRight className="h-4 w-4" weight="bold" />
          </Link>
        </div>
      </section>

      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground">
        Reviewed by the ServicePros marketplace team. Last updated: {GUIDE_LAST_REVIEWED}.
      </p>
    </main>
  )
}
