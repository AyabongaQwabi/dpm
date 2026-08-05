import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { HelpAccordion } from '@/components/help/HelpAccordion'
import { HELP_SECTIONS } from '@/lib/help-content'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, faqPageJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Help centre',
  description:
    'Answers for customers and providers on ServicePros — accounts, credits and payments, bookings, listings and verification, subscriptions and commission, and disputes.',
  alternates: canonicalAlternates('/help'),
  openGraph: defaultOpenGraph(
    'Help centre',
    'Answers for customers and providers on ServicePros — credits, bookings, verification, subscriptions, and disputes.',
    '/help',
  ),
  twitter: defaultTwitter(
    'Help centre',
    'Answers for customers and providers on ServicePros — credits, bookings, verification, subscriptions, and disputes.',
  ),
}

export default function HelpPage() {
  const allQuestions = HELP_SECTIONS.flatMap((section) =>
    section.topics.flatMap((topic) => topic.questions.map((q) => ({ question: q.question, answer: q.answer }))),
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Help', path: '/help' },
          ]),
          faqPageJsonLd(allQuestions),
        ]}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Help</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Help centre</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
        Answers for customers and providers. Can&apos;t find what you need?{' '}
        <Link href="/contact" className="text-primary hover:underline">Contact us</Link>.
      </p>

      {/* Section jump nav */}
      <nav aria-label="Help sections" className="mt-8 flex flex-wrap gap-3">
        {HELP_SECTIONS.map((section) => (
          <a
            key={section.audience}
            href={`#${section.audience}`}
            className="rounded-xl border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {section.title}
          </a>
        ))}
      </nav>

      {HELP_SECTIONS.map((section) => (
        <section key={section.audience} id={section.audience} className="mt-14 scroll-mt-20">
          <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
          <div className="mt-8 space-y-10">
            {section.topics.map((topic) => (
              <div key={topic.id}>
                <h3 className="font-display text-lg font-semibold text-foreground">{topic.title}</h3>
                <div className="mt-4">
                  <HelpAccordion topic={topic} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
