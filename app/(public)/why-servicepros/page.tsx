import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import {
  COMMISSION_BRACKETS,
  PACKAGES,
  effectiveRate,
  findBracket,
  formatFee,
  formatRate,
} from '@/lib/pricing-config'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

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
      {/* Hero — the golden rule */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">For providers</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance lg:text-5xl">
              You never pay to compete for a lead
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground text-pretty">
              Commission is charged only on completed, paid work — never on an enquiry, a quote, or a
              message. Every enquiry that doesn&apos;t turn into a booking costs you nothing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/get-listed"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
              >
                Get listed
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">What that means in Rands</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Say you get {exampleEnquiries} enquiries in a month and win {exampleJobsWon} of them, each worth
          about {formatFee(EXAMPLE_JOB_VALUE)}.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h3 className="font-display text-lg font-semibold">On a lead-bidding platform</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You pay for enquiries whether or not you win the job — {exampleEnquiries} enquiries means{' '}
              {exampleEnquiries} charges, regardless of outcome.
            </p>
          </div>
          <div className="rounded-2xl border border-primary-accent/40 bg-primary-accent/5 p-6">
            <h3 className="font-display text-lg font-semibold">On ServicePros</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You pay {formatFee(basePackage.monthlyFee)} for the month, plus {formatRate(exampleRate)}{' '}
              commission (the {exampleBracket.label} bracket rate) on each of the {exampleJobsWon} jobs you
              actually complete — {formatFee(exampleCommissionPerJob)} per job,{' '}
              {formatFee(exampleTotalCommission)} total.
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Total for the month: {formatFee(exampleTotalCost)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          The other {exampleEnquiries - exampleJobsWon} enquiries you didn&apos;t win cost you nothing.
        </p>
      </section>

      {/* What R99 buys */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">What {formatFee(basePackage.monthlyFee)} a month buys</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{basePackage.planDetail}</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Icon.store, title: 'A real profile', body: 'Your business, your services, your gallery — not a shared listing.' },
              { icon: Icon.confetti, title: 'Provider stories', body: 'Share updates and completed work to build trust over time.' },
              { icon: Icon.verified, title: 'A verification path', body: 'Move from Unverified through contact, CIPC, and FICA verification.' },
              { icon: Icon.chat, title: 'Your dashboard', body: 'Manage services, bookings, and customer messages in one place.' },
              { icon: Icon.search, title: 'Discovery', body: 'Appear across category and city pages where customers are searching.' },
              { icon: Icon.shield, title: 'Commission only on completed work', body: 'No fee until a customer pays and confirms the job is done.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border bg-card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" weight="duotone" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission brackets + ceiling packages */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Commission brackets and ceiling packages</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Commission scales with the size of each sale. A ceiling package caps that rate on your bigger
          jobs — the higher the ceiling package, the lower the cap.
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Sale value</th>
                  <th className="px-4 py-2 font-medium">Standard rate</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_BRACKETS.map((bracket) => (
                  <tr key={bracket.label} className="border-t">
                    <td className="px-4 py-2">{bracket.label}</td>
                    <td className="px-4 py-2">{formatRate(bracket.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Package</th>
                  <th className="px-4 py-2 font-medium">Monthly fee</th>
                  <th className="px-4 py-2 font-medium">Ceiling</th>
                </tr>
              </thead>
              <tbody>
                {ceilingPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-t">
                    <td className="px-4 py-2">{pkg.name}</td>
                    <td className="px-4 py-2">{formatFee(pkg.monthlyFee)}</td>
                    <td className="px-4 py-2">{formatRate(pkg.ceilingRate as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground">
          A ceiling package starts paying for itself once the commission it saves you on your bigger jobs
          exceeds the extra monthly fee over the base plan — the more high-value jobs you close, the
          sooner that happens. See the full breakdown and a calculator on our{' '}
          <Link href="/pricing" className="text-primary hover:underline">pricing page</Link>.
        </p>
      </section>

      {/* Comparison against lead-bidding model */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">A different model, not just a different price</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">Pay-per-lead platforms</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Providers bid against each other or pay to unlock the same enquiry. The platform earns
                from the enquiry itself — whether or not any provider wins the job, and whether or not the
                customer ever books.
              </p>
            </div>
            <div className="rounded-2xl border border-primary-accent/40 bg-primary-accent/5 p-6">
              <h3 className="font-display text-lg font-semibold">ServicePros</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We earn a subscription fee for your listing, and commission only when a job is completed
                and paid. If you don&apos;t win the work, we don&apos;t earn from that enquiry either.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ready to get listed?</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              Create your provider profile and start appearing in category and city search.
            </p>
          </div>
          <Link
            href="/get-listed"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
          >
            Get listed
            <Icon.arrowRight className="h-4 w-4" weight="bold" />
          </Link>
        </div>
      </section>
    </main>
  )
}
