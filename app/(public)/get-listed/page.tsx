import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { VerifiedBadge, TIER_META, type VerificationTier } from '@/components/ui/VerifiedBadge'

export const metadata: Metadata = {
  title: 'Get listed as a provider',
  description:
    'Win real customer bookings and payments, get found on Google and AI assistants, manage everything from a provider dashboard, and grow with verified badges and a partners marketplace.',
}

const benefits = [
  {
    icon: Icon.confetti,
    title: 'Real bookings & payments',
    body: 'Receive genuine customer service requests and get paid securely through the platform — no chasing invoices.',
  },
  {
    icon: Icon.store,
    title: 'Your provider dashboard',
    body: 'Manage your profile, services, requests, and customer chats from one organised workspace.',
  },
  {
    icon: Icon.search,
    title: 'Found on Google',
    body: 'Your profile is built for SEO, so customers searching the web discover your business.',
  },
  {
    icon: Icon.sparkle,
    title: 'Cited by AI assistants',
    body: 'Structured listings help AI tools like ChatGPT and Gemini recommend and cite your business.',
  },
  {
    icon: Icon.star,
    title: 'Opt-in reviews',
    body: 'Choose when to collect reviews and build trust at your own pace — reviews are always your call.',
  },
  {
    icon: Icon.heart,
    title: 'Partners marketplace',
    body: 'Buy business services from vetted professionals: graphic designers, tax consultants, compliance advisors, business strategists, web developers, and more.',
  },
]

const businessTypes = [
  { label: 'Entrepreneur', body: 'Sole proprietors and side hustles' },
  { label: 'Co-op', body: 'Co-operative member businesses' },
  { label: 'Company', body: 'Registered private companies' },
  { label: 'Non-profit', body: 'NPOs and community organisations' },
]

const tiers: VerificationTier[] = ['contact', 'cipc', 'fica']

const tierRequirements: Record<VerificationTier, string> = {
  contact: 'Confirm your cell number and email address.',
  cipc: 'Verify your registered CIPC business details.',
  fica: 'Submit FICA documents — ID and proof of address.',
}

export default function GetListedPage() {
  return (
    <main>
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">For providers</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance lg:text-5xl">
              Get listed and turn local searches into paying customers
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground text-pretty">
              Join a marketplace built to bring you real bookings, secure payments, and visibility across
              Google and AI assistants — all managed from your own provider dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/provider-signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                List your business
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
              <Link
                href="/provider-login"
                className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
              >
                Provider login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Everything you get</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One listing, a full toolkit to find customers and run your business.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-2xl border bg-card p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <benefit.icon className="h-6 w-6" weight="duotone" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verified badges */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">Boost your listing with verified badges</h2>
            <p className="mt-2 text-muted-foreground">
              Purchase verification to stand out in search and earn customer trust. Each badge proves a
              different level of credibility — collect any combination.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {tiers.map((tier) => {
              const meta = TIER_META[tier]
              return (
                <div key={tier} className="flex flex-col rounded-2xl border bg-card p-6">
                  <VerifiedBadge tier={tier} size="md" />
                  <h3 className="mt-4 font-display text-lg font-semibold">{meta.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{meta.description}</p>
                  <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">How to qualify: </span>
                    {tierRequirements[tier]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Business types */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight">Built for every kind of business</h2>
          <p className="mt-2 text-muted-foreground">
            Tell us how you&apos;re structured during sign-up and we tailor your profile accordingly.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {businessTypes.map((type) => (
            <div key={type.label} className="rounded-2xl border bg-card p-5">
              <h3 className="font-display text-base font-semibold">{type.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{type.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ready to get found?</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              Create your provider profile in minutes and start receiving customer requests.
            </p>
          </div>
          <Link
            href="/provider-signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            List your business
            <Icon.arrowRight className="h-4 w-4" weight="bold" />
          </Link>
        </div>
      </section>
    </main>
  )
}
