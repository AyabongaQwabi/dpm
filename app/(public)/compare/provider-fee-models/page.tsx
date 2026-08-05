import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { ComparisonDisclosure } from '@/components/compare/ComparisonDisclosure'
import { GUIDE_LAST_REVIEWED } from '@/lib/policy-content'
import { breadcrumbJsonLd, canonicalAlternates, comparisonPageJsonLd, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

const PATH = '/compare/provider-fee-models'
const TITLE = 'Provider Fee Models: Leads, Listings, and Commission'
const DESCRIPTION =
  'How service providers may pay across different marketplace types — monthly listings, pay-per-enquiry, pay-per-lead, commission on completed work, and partner fulfilment fees — explained in neutral terms.'

const CRITERIA = [
  'Monthly listing fee',
  'Pay per enquiry',
  'Pay per unlocked lead',
  'Commission on completed work',
  'Optional boosted visibility',
  'Fulfilment or partner-service fees',
]

const FEE_MODELS = [
  {
    title: 'Monthly listing fee',
    body: 'A flat recurring fee for having a profile on the platform, independent of how many enquiries or bookings come through it.',
  },
  {
    title: 'Pay per enquiry',
    body: 'A charge each time a customer enquiry is generated, whether or not it turns into paid work.',
  },
  {
    title: 'Pay per unlocked lead',
    body: 'A charge to reveal or access a specific customer’s contact details or request, often before any conversation has happened.',
  },
  {
    title: 'Commission on completed work',
    body: 'A percentage of the job value, charged only once work is completed and paid for — the fee only exists if the provider actually earned from the job.',
  },
  {
    title: 'Optional boosted visibility',
    body: 'An extra fee to appear higher in search results or featured sections, on top of a base listing or commission model.',
  },
  {
    title: 'Fulfilment or partner-service fees',
    body: 'Fees tied to add-on services — design work, admin support, growth services — bought separately from the core listing.',
  },
]

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonicalAlternates(PATH),
  openGraph: defaultOpenGraph(TITLE, DESCRIPTION, PATH),
  twitter: defaultTwitter(TITLE, DESCRIPTION),
  robots: { index: false, follow: false },
}

export default function ProviderFeeModelsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Compare', path: '/compare/service-marketplace-models' },
            { name: TITLE, path: PATH },
          ]),
          ...comparisonPageJsonLd({ path: PATH, name: TITLE, description: DESCRIPTION, criteria: CRITERIA }),
        ]}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Compare</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Provider fee models: leads, listings, and commission</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        Service marketplaces charge providers in different ways, and the fee model shapes how much risk a
        provider carries before they get paid work. This guide breaks down the common fee types you might
        encounter, in neutral terms, so you can ask the right questions before signing up anywhere.
      </p>

      <section className="mt-12 grid gap-5 sm:grid-cols-2">
        {FEE_MODELS.map((model) => (
          <div key={model.title} className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold text-foreground">{model.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{model.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which model suits customers?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Fee models aren&apos;t usually visible to customers directly, but they shape provider behaviour.
          Commission-only models tend to encourage providers to take on work they can actually deliver,
          since the platform only earns alongside them. Pay-per-lead models can encourage providers to chase
          volume regardless of fit, since the fee is charged whether or not the job converts.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Which model suits providers?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Providers with a strong close rate on enquiries may do fine on pay-per-lead models, since each
          paid lead is likely to convert. Providers who receive a lot of enquiries that don&apos;t convert —
          tyre-kickers, out-of-area requests, mismatched jobs — usually do better on a commission-only or
          listing-based model, where they aren&apos;t charged for enquiries that go nowhere.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Questions to ask before choosing a platform</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-muted-foreground">
          <li>Am I charged when an enquiry comes in, or only when I complete paid work?</li>
          <li>Is there a monthly fee on top of any per-lead or commission charges?</li>
          <li>Can I see the total cost of a completed job before I accept it?</li>
          <li>Are boosted visibility or add-on services optional, or effectively required to compete?</li>
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border bg-card p-6">
        <h2 className="text-2xl font-bold tracking-tight">The ServicePros approach</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          ServicePros does not charge providers for enquiries or leads. Providers pay a monthly listing
          subscription and commission only on completed, paid bookings — see the full breakdown on{' '}
          <Link href="/pricing" className="text-primary hover:underline">provider pricing</Link>{' '}
          and <Link href="/why-servicepros" className="text-primary hover:underline">why providers choose ServicePros</Link>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/get-listed"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-5 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
          >
            Get listed
          </Link>
          <Link
            href="/compare/service-marketplace-models"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            Compare marketplace models
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          See also: <Link href="/dpm" className="text-primary hover:underline">what a DPM is</Link>,{' '}
          <Link href="/search" className="text-primary hover:underline">find providers</Link>,{' '}
          <Link href="/verification" className="text-primary hover:underline">verification</Link>, and{' '}
          <Link href="/provider-terms" className="text-primary hover:underline">provider terms</Link>.
        </p>
      </section>

      <ComparisonDisclosure lastUpdated={GUIDE_LAST_REVIEWED} />
    </main>
  )
}
