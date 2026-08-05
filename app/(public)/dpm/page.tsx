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
  'Directory & Provider Marketplace. A directory tells you a business exists. A marketplace lets you hire and pay them. A DPM is both in one place - real profiles you can browse and compare, and the ability to book, pay and review without leaving.'

const DPM_STRUCTURED_DEFINITION =
  'Directory and Provider Marketplace. A directory tells you a business exists. A marketplace lets you hire and pay them. A DPM is both in one place - real profiles you can browse and compare, and the ability to book, pay and review without leaving.'

export const metadata: Metadata = {
  title: 'What is a DPM? Directory and Provider Marketplace, defined',
  description: DPM_DEFINITION,
  alternates: canonicalAlternates('/dpm'),
  openGraph: defaultOpenGraph('What is a DPM?', DPM_DEFINITION, '/dpm'),
  twitter: defaultTwitter('What is a DPM?', DPM_DEFINITION),
}

function EngineFanOutGraphic() {
  return (
    <svg
      role="img"
      aria-labelledby="engine-fanout-title"
      viewBox="0 0 720 260"
      className="h-auto w-full text-primary"
    >
      <title id="engine-fanout-title">The DPM engine branching into industry platforms, with ServicePros first and live</title>
      <defs>
        <marker id="engine-fanout-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
        <path d="M230 130 C320 130 338 62 440 62" markerEnd="url(#engine-fanout-arrow)" />
        <path d="M230 130 C328 130 342 130 440 130" markerEnd="url(#engine-fanout-arrow)" />
        <path d="M230 130 C320 130 338 198 440 198" markerEnd="url(#engine-fanout-arrow)" />
      </g>
      <rect x="42" y="82" width="188" height="96" rx="8" fill="hsl(var(--card))" stroke="currentColor" strokeWidth="2" />
      <text x="136" y="122" textAnchor="middle" className="fill-foreground font-display text-[18px] font-bold">The DPM engine</text>
      <text x="136" y="148" textAnchor="middle" className="fill-muted-foreground text-[13px]">One configurable codebase</text>

      <rect x="454" y="32" width="210" height="60" rx="8" fill="hsl(var(--primary))" stroke="currentColor" strokeWidth="2" />
      <text x="559" y="58" textAnchor="middle" className="fill-primary-foreground font-display text-[16px] font-bold">ServicePros</text>
      <text x="559" y="78" textAnchor="middle" className="fill-primary-foreground/80 text-[12px]">first and live</text>

      <rect x="454" y="100" width="210" height="60" rx="8" fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <text x="559" y="136" textAnchor="middle" className="fill-muted-foreground text-[13px]">Industry platform</text>

      <rect x="454" y="168" width="210" height="60" rx="8" fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <text x="559" y="204" textAnchor="middle" className="fill-muted-foreground text-[13px]">Industry platform</text>
    </svg>
  )
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
            termName: 'DPM',
            description: DPM_STRUCTURED_DEFINITION,
            inDefinedTermSetPath: '/dpm',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'What is a DPM? Directory and Provider Marketplace, defined',
            description: DPM_STRUCTURED_DEFINITION,
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

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Why the category needed a name</h2>
        <div className="mt-5 space-y-4 text-base leading-7 text-muted-foreground">
          <p>
            A directory lists a business and leaves it there - a name, a number, a dead page. A lead
            marketplace makes businesses bid and pay to compete for the same enquiry, so the platform earns
            whether or not the provider does.
          </p>
          <p>
            Neither describes what ServicePros is, so Namoota Technology named the thing it actually is:
            a term we coined for this shape of platform.
          </p>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">The three parts of the name</h2>
          <ol className="mt-8 space-y-6">
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">1</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Directory - being findable</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Category and city pages, search, real profiles instead of adverts.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">2</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Provider - the business itself</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Services, gallery, verification, reviews, a dashboard they control.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">3</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Marketplace - the transaction</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Booking, credits, payment, completion, reputation.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">The rule that defines the category</p>
        <p className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
          The platform earns only when the provider earns.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          Providers never pay to compete for leads; commission is charged only on completed, paid work.
        </p>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Behind the name</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">Where the name comes from</h2>
            <div className="mt-5 space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                The term started inside Namoota Technology as the name for a build tool - the DPM engine,
                short for Directory Provider Maker: a configurable codebase that deploys a complete
                directory and provider marketplace for a given industry.
              </p>
              <p>
                Configure it for one kind of business and a full platform for that trade exists. ServicePros
                is the first platform deployed on it. The name outgrew the tool and became the name for the
                category of platform it produces.
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
          <EngineFanOutGraphic />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">DPM in practice</h2>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          ServicePros shows the model live: one place to discover real providers, compare their work, book,
          pay, and build trust through completed jobs.
        </p>
        <div className="mt-8">
          <StatsBand providerCount={providerCount} categoryCount={categoryCount} cityCount={cityCount} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          See <Link href="/about" className="text-primary hover:underline">how ServicePros applies the model</Link>.
        </p>
      </section>
    </main>
  )
}
