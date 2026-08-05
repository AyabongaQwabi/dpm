import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import creditPromotions from '@/config/credit-promotions.json'
import { calculatePurchaseCredits, getActivePromotion, type CreditPromotion } from '@/lib/domain/credit-promotions'
import { PLATFORM_CONFIG_SEED } from '@/lib/pricing-config'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

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
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">How it works</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance lg:text-5xl">
              Find a provider, buy credits, book the job
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground text-pretty">
              ServicePros runs on a simple credit system — no subscriptions for customers, no surprise
              fees. Here&apos;s exactly how it works, from search to review.
            </p>
          </div>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <FlowDiagram />
      </section>

      {/* 1. Find someone */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
            1
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Find someone</h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Search by category and city, or browse listings directly. Every result is a real provider
              profile — not an advert slot — with services, a gallery, and reviews from completed
              bookings, so you can compare before you commit.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
              >
                Browse providers
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Browse services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Credits explained */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
              2
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Credits explained</h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                1 credit equals R1. Buy a credit pack once, then spend those credits on any provider or
                service on the platform — there&apos;s no subscription, and unused credits stay in your
                wallet until you use them.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CREDIT_PACKS.map((pack) => {
                  const { baseCredits, bonusCredits, totalCredits } = calculatePurchaseCredits(
                    pack,
                    activePromotion ? [activePromotion] : [],
                  )
                  return (
                    <div key={pack} className="rounded-2xl border bg-card p-5">
                      <p className="text-lg font-bold">Pay R{baseCredits.toLocaleString('en-ZA')}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {baseCredits.toLocaleString('en-ZA')} credits
                      </p>
                      {bonusCredits > 0 && (
                        <p className="mt-2 text-sm font-medium text-primary-accent">
                          +{bonusCredits.toLocaleString('en-ZA')} bonus credits
                        </p>
                      )}
                      <p className="mt-3 text-sm font-semibold">
                        Get {totalCredits.toLocaleString('en-ZA')} credits
                      </p>
                    </div>
                  )
                })}
              </div>
              {activePromotion && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {activePromotion.description} — active now on every credit pack.
                </p>
              )}
              <Link
                href="/customer-account/credits"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-2.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
              >
                Buy credits
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Book and pay */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
            3
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Book and pay</h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Choose a service package on a provider&apos;s profile and go to checkout. Your wallet
              balance and the package price are shown up front — if you don&apos;t have enough credits,
              you&apos;re prompted to top up before you can continue.
            </p>
            <ol className="mt-6 max-w-2xl list-decimal space-y-3 pl-6 text-sm leading-6 text-muted-foreground">
              <li>Review the package, delivery time, and what&apos;s included, then add any notes for the provider.</li>
              <li>Confirm the booking — credits are deducted from your wallet immediately.</li>
              <li>A message thread opens automatically between you and the provider to coordinate details.</li>
              <li>The provider accepts or declines the request. If it&apos;s declined, or if it isn&apos;t responded to in time, your credits are returned to your wallet.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* 4. After the job */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
              4
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">After the job</h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                Once the provider marks the work complete, you confirm completion from your account. That
                confirmation is what releases the provider&apos;s payout and unlocks your review — reviews
                can only be left after a booking is marked completed, so every review on ServicePros is
                tied to a real, paid booking.
              </p>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                If something goes wrong, message the provider first. If it isn&apos;t resolved, our{' '}
                <Link href="/refund" className="text-primary hover:underline">refund policy</Link> explains
                how credit refunds work, and you can{' '}
                <Link href="/contact" className="text-primary hover:underline">report a problem with a provider</Link>{' '}
                directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ready to find a provider?</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              Search by category and city, or browse services directly.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            Browse providers
            <Icon.arrowRight className="h-4 w-4" weight="bold" />
          </Link>
        </div>
      </section>
    </main>
  )
}

const FLOW_STEPS = [
  { label: 'Browse', icon: Icon.search },
  { label: 'Buy credits', icon: Icon.store },
  { label: 'Book', icon: Icon.chat },
  { label: 'Job completed', icon: Icon.verified },
  { label: 'Review', icon: Icon.star },
] as const

function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 900 120"
      role="img"
      aria-label="Flow: browse, buy credits, book, job completed, review"
      className="w-full text-foreground"
    >
      <title>Browse to buy credits to book to job completed to review</title>
      {FLOW_STEPS.map((step, i) => {
        const cx = 90 + i * 180
        return (
          <g key={step.label}>
            {i < FLOW_STEPS.length - 1 && (
              <line
                x1={cx + 40}
                y1={40}
                x2={cx + 140}
                y2={40}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            )}
            <circle cx={cx} cy={40} r={32} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={2} />
            <text x={cx} y={95} textAnchor="middle" fontSize={13} fill="currentColor" className="font-medium">
              {step.label}
            </text>
          </g>
        )
      })}
      <defs>
        <marker id="arrow" markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" fillOpacity={0.35} />
        </marker>
      </defs>
    </svg>
  )
}
