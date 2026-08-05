import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import creditPromotions from '@/config/credit-promotions.json'
import { calculatePurchaseCredits, getActivePromotion, type CreditPromotion } from '@/lib/domain/credit-promotions'
import { PLATFORM_CONFIG_SEED } from '@/lib/pricing-config'
import { GUIDE_LAST_REVIEWED } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'How ServicePros works',
  description:
    'How to find a provider, buy credits, book a service, and what happens after the job on ServicePros — South Africa’s credit-based service marketplace.',
  alternates: canonicalAlternates('/how-it-works'),
  openGraph: defaultOpenGraph(
    'How ServicePros works',
    'Find providers, buy credits, book, and see what happens after the job — the full customer journey on ServicePros.',
    '/how-it-works',
  ),
  twitter: defaultTwitter(
    'How ServicePros works',
    'Find providers, buy credits, book, and see what happens after the job — the full customer journey on ServicePros.',
  ),
}

const CREDIT_PACKS: number[] = JSON.parse(PLATFORM_CONFIG_SEED.credit_pack_denominations)
const promotions = (creditPromotions as { promotions: CreditPromotion[] }).promotions
const activePromotion = getActivePromotion(promotions)

export default function HowItWorksPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ])}
      />
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">How it works</p>
          <div className="mt-8 max-w-3xl space-y-6">
            <h1 className="text-5xl font-display font-semibold tracking-tight leading-tight">Find a provider, buy credits, book the job.</h1>
            <p className="text-xl leading-9 text-slate-300">
              ServicePros uses a simple credit wallet so you can book services without subscriptions or surprise fees. Here&apos;s the journey from discovery to review.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          ServicePros works in four steps: search for a service or provider, compare profiles and reviews,
          book a service with credits, and review the provider after the work is complete. Providers manage
          listings, services, messages, bookings, and verification from their dashboard.
        </p>
        <nav aria-label="Jump to section" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-primary">
          <a href="#discover" className="hover:underline">1. Discover</a>
          <a href="#credits" className="hover:underline">2. Buy credits</a>
          <a href="#book" className="hover:underline">3. Book</a>
          <a href="#review" className="hover:underline">4. Review</a>
        </nav>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-[2rem] border border-slate-200/10 bg-white/90 p-8 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between gap-6 overflow-x-auto py-6">
            {['Browse', 'Buy credits', 'Book', 'Complete', 'Review'].map((label, index) => (
              <div key={label} className="flex min-w-[140px] flex-col items-center gap-4 rounded-3xl border border-slate-200/80 bg-slate-50 p-5 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary text-lg font-bold">{index + 1}</span>
                <p className="text-sm font-semibold text-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-sm leading-7 text-muted-foreground">
            <p>Search providers by category or city, buy credits once, then spend them on the service you want. Your wallet balance is shown clearly at checkout, and credits are only used for confirmed bookings.</p>
          </div>
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-7xl px-4 py-16 scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:items-start">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary font-display text-lg font-bold">1</span>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Discover the right provider</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              Browse real provider profiles instead of adverts. Every result includes services, photos, verification badges and reviews from completed jobs so you can choose with confidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                Browse providers
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-xl border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Browse services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="credits" className="border-y bg-muted/30 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:items-start">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary font-display text-lg font-bold">2</span>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Buy credits once</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                1 credit equals R1. Buy a pack when you need it, keep credits in your wallet, and use them anytime. There is no ongoing customer subscription.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CREDIT_PACKS.map((pack) => {
                  const { baseCredits, bonusCredits, totalCredits } = calculatePurchaseCredits(pack, activePromotion ? [activePromotion] : [])
                  return (
                    <div key={pack} className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
                      <p className="text-lg font-semibold">Pay R{baseCredits.toLocaleString('en-ZA')}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{baseCredits.toLocaleString('en-ZA')} credits</p>
                      {bonusCredits > 0 && (
                        <p className="mt-3 text-sm font-semibold text-primary">+{bonusCredits.toLocaleString('en-ZA')} bonus</p>
                      )}
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">Get {totalCredits.toLocaleString('en-ZA')} credits</p>
                    </div>
                  )
                })}
              </div>
              {activePromotion && (
                <p className="mt-4 text-sm text-muted-foreground">{activePromotion.description} — active now on every credit pack.</p>
              )}
              <Link
                href="/customer-account/credits"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                Buy credits
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="book" className="mx-auto max-w-7xl px-4 py-20 scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:items-start">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary font-display text-lg font-bold">3</span>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Book with certainty</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              Choose a service package, confirm the booking, and credits are deducted only when the request is placed. If a provider declines or does not respond in time, your credits are returned.
            </p>
            <ol className="mt-6 max-w-2xl list-decimal space-y-3 pl-6 text-sm leading-7 text-muted-foreground">
              <li>Review the service details and add notes for the provider.</li>
              <li>Confirm the booking and reserve credits in your wallet.</li>
              <li>Message the provider directly to agree on the details.</li>
              <li>If the provider declines or does not respond, your credits come back to your wallet.</li>
            </ol>
          </div>
        </div>
      </section>

      <section id="review" className="border-t bg-muted/30 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:items-start">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary font-display text-lg font-bold">4</span>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Review after the job</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                Once the provider marks work complete, you confirm delivery. That confirmation releases the provider&apos;s payout and unlocks the review, so every review is based on a real, paid booking.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                If something isn&apos;t right, message the provider first. If it cannot be resolved, check our{' '}
                <Link href="/refund" className="text-primary hover:underline">refund policy</Link> and{' '}
                <Link href="/contact" className="text-primary hover:underline">report a problem</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Ready to book?</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              Browse providers, top up credits, and book services when you are ready.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            Browse providers
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
