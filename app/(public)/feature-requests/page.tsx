import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { FeatureRequestForm } from '@/components/feature-requests/FeatureRequestForm'
import { Icon } from '@/components/ui/Icon'
import {
  breadcrumbJsonLd,
  canonicalAlternates,
  defaultOpenGraph,
  defaultTwitter,
} from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Suggest a ServicePros feature',
  description:
    'Send a feature request for ServicePros. Tell us what would make search, profiles, payments, messaging, reviews, or mobile better.',
  alternates: canonicalAlternates('/feature-requests'),
  openGraph: defaultOpenGraph(
    'Suggest a ServicePros feature',
    'Share a practical feature request for ServicePros. A real person reads each useful request.',
    '/feature-requests',
  ),
  twitter: defaultTwitter(
    'Suggest a ServicePros feature',
    'Share a practical feature request for ServicePros. A real person reads each useful request.',
  ),
  robots: { index: true, follow: true },
}

const STEPS = [
  'Tell us what you want to improve.',
  'Aya receives the request by email.',
  'We may reply if we need more detail.',
  'Not every idea gets built, but useful requests shape the roadmap.',
] as const

export default function FeatureRequestsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Feature requests', path: '/feature-requests' },
          ]),
        ]}
      />

      <section className="rounded-[2rem] border border-slate-200/10 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary-accent">Feature requests</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-display font-semibold tracking-tight sm:text-5xl">
          Tell us what ServicePros should do better
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
          Use this page for practical product ideas: a missing tool, a smoother step, or something that would make
          ServicePros easier for customers, providers, or referral agents. A real person reads it. We may reply.
          Not everything gets built.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-accent text-xs font-bold text-primary-accent-foreground">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-200">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <FeatureRequestForm />
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border bg-muted/30 p-5">
            <div className="flex items-center gap-2">
              <Icon.chat className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-semibold">Good requests are specific</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A short example, who it helps, and where you got stuck is more useful than a big pitch.
            </p>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Icon.shield className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-semibold">Privacy note</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We store your name, email, request, browser details, and a hashed connection signal for spam control.
              We never store your raw IP address.
            </p>
            <Link href="/privacy" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
              Read the privacy policy
            </Link>
          </section>
        </aside>
      </section>
    </main>
  )
}
