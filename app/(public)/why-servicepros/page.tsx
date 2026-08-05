import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import {
  COMMISSION_BRACKETS,
  PACKAGES,
  effectiveRate,
  findBracket,
  formatFee,
  formatRate,
} from '@/lib/pricing-config'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Why ServicePros',
  description:
    'Why providers choose ServicePros: no pay-per-lead fees, commission only on completed work, and a real profile from R99 a month.',
  alternates: canonicalAlternates('/why-servicepros'),
  openGraph: defaultOpenGraph(
    'Why ServicePros',
    'No pay-per-lead fees. Commission only on completed, paid work. See what R99 a month actually buys.',
    '/why-servicepros',
  ),
  twitter: defaultTwitter(
    'Why ServicePros',
    'No pay-per-lead fees. Commission only on completed, paid work. See what R99 a month actually buys.',
  ),
}

const basePackage = PACKAGES[0]
const ceilingPackages = PACKAGES.filter((pkg) => pkg.ceilingRate !== null)

// Worked example: 10 enquiries, 2 won jobs, each priced inside the second
// bracket — computed from live config, not typed-in numbers.
const EXAMPLE_JOB_VALUE = 4200
const exampleBracket = findBracket(EXAMPLE_JOB_VALUE)
const exampleRate = effectiveRate(EXAMPLE_JOB_VALUE, null)
const exampleCommissionPerJob = Math.round(EXAMPLE_JOB_VALUE * exampleRate)
const exampleJobsWon = 2
const exampleTotalCommission = exampleCommissionPerJob * exampleJobsWon
const exampleTotalCost = basePackage.monthlyFee + exampleTotalCommission
const exampleEnquiries = 10

export default function WhyServiceProsPage() {
  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Why ServicePros', path: '/why-servicepros' },
        ])}
      />
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">For providers</p>
            <h1 className="mt-4 text-5xl font-display font-semibold tracking-tight leading-tight">
              You never pay to compete for a lead.
            </h1>
            <p className="mt-6 text-xl leading-9 text-slate-300">
              ServicePros only charges commission on completed, paid work. Every enquiry that doesn&apos;t turn into a booking costs you nothing.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/get-listed"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                Get listed
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">What this means</p>
            <h2 className="text-4xl font-display font-semibold tracking-tight">A clearer, fairer model for providers and customers.</h2>
            <p className="max-w-2xl leading-8 text-muted-foreground">
              Unlike pay-per-lead platforms, ServicePros aligns fees with completed work. Providers build real profiles, customers book actual services, and both sides know what to expect from the beginning.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200/10 bg-slate-50/80 p-8 shadow-xl shadow-slate-900/5">
            <p className="text-sm uppercase tracking-[0.24em] text-primary-accent">Example scenario</p>
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">
                If you receive {exampleEnquiries} enquiries and win {exampleJobsWon} jobs at about {formatFee(EXAMPLE_JOB_VALUE)} each, you only pay commission on the jobs you complete.
              </p>
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">ServicePros total cost</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatFee(exampleTotalCost)}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Includes {formatFee(basePackage.monthlyFee)} monthly fee plus {formatRate(exampleRate)} commission on each of the {exampleJobsWon} completed jobs.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                The other {exampleEnquiries - exampleJobsWon} enquiries that don&apos;t convert cost you nothing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">What {formatFee(basePackage.monthlyFee)} a month gets you</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Your base plan gives you a full provider presence on ServicePros — from a branded profile to verification and booking controls.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Icon.store, title: 'A real profile', body: 'Your business, services, gallery and reviews all live on a branded page.' },
              { icon: Icon.confetti, title: 'Provider stories', body: 'Share work samples and business updates to build long-term trust.' },
              { icon: Icon.verified, title: 'Verification path', body: 'Progress from Unverified through contact, CIPC and FICA verification.' },
              { icon: Icon.chat, title: 'Dashboard control', body: 'Manage services, messages, bookings and verification from one place.' },
              { icon: Icon.search, title: 'Discovery', body: 'Appear in category and city search when customers are actively looking.' },
              { icon: Icon.sparkle, title: 'Search and AI discovery', body: 'Your profile is structured as a public provider page, connected to category, city, and service pages so customers and search tools can understand where you work and what you offer.' },
              { icon: Icon.shield, title: 'Commission only on completed work', body: 'You don’t pay unless the job is finished and paid.' },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200/10 bg-white p-6 shadow-sm">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" weight="duotone" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-xs text-muted-foreground">
            Search rankings and AI citations are not guaranteed. They depend on search engine and AI
            system choices, query context, profile quality, competition, and crawl/index eligibility.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-[2rem] border border-slate-200/10 bg-slate-50/80 p-10 shadow-xl shadow-slate-900/5">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">Commission brackets</p>
              <p className="text-lg leading-8 text-muted-foreground">
                Commission scales with the size of each sale. Ceiling packages lower the effective amount you pay on bigger jobs.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-foreground">Sale value brackets</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {COMMISSION_BRACKETS.map((bracket) => (
                    <div key={bracket.label} className="flex items-center justify-between border-t border-slate-200/70 py-2 first:border-t-0">
                      <span>{bracket.label}</span>
                      <span>{formatRate(bracket.rate)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-foreground">Ceiling packages</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {ceilingPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between border-t border-slate-200/70 py-2 first:border-t-0">
                      <span>{pkg.name}</span>
                      <span>{formatRate(pkg.ceilingRate as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-6 text-muted-foreground">
            A ceiling package begins saving you money once the commission it caps on bigger jobs offsets the extra monthly fee. If you close higher-value work, the cap helps your margins.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            See the full breakdown and calculator on our{' '}
            <Link href="/pricing" className="text-primary hover:underline">pricing page</Link>.
          </p>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">A different model, not just a different price</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h3 className="font-display text-lg font-semibold">Pay-per-lead platforms</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Providers bid against each other or pay to unlock the same enquiry. The platform earns from the enquiry itself, whether or not any provider wins the job.
              </p>
            </div>
            <div className="rounded-3xl border border-primary-accent/30 bg-primary-accent/10 p-8 shadow-sm">
              <h3 className="font-display text-lg font-semibold">ServicePros</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                We earn from a provider subscription and a small commission only when a job is completed and paid. If you don&apos;t win the work, we don&apos;t earn from that enquiry.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Ready to get listed?</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              Create your provider profile and start appearing in search results across categories and cities.
            </p>
          </div>
          <Link
            href="/get-listed"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            Get listed
            <Icon.arrowRight className="h-4 w-4" weight="bold" />
          </Link>
        </div>
      </section>
    </main>
  )
}
