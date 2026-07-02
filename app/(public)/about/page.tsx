import type { Metadata } from 'next'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About ServicePros — South African provider marketplace',
  description:
    'ServicePros helps South Africans discover trusted local providers through searchable profiles, services, reviews, galleries, and useful content.',
  alternates: canonicalAlternates('/about'),
  openGraph: defaultOpenGraph(
    'About ServicePros — South African provider marketplace',
    'ServicePros helps South Africans discover trusted local providers through searchable profiles, services, reviews, and content.',
    '/about',
  ),
  twitter: defaultTwitter(
    'About ServicePros — South African provider marketplace',
    'ServicePros helps South Africans discover trusted local providers through searchable profiles, services, reviews, and content.',
  ),
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">About</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">A marketplace for clearer local service decisions.</h1>
      <div className="mt-8 space-y-5 leading-8 text-muted-foreground">
        <p>ServicePros helps customers discover providers through searchable profiles, services, reviews, galleries, and useful content.</p>
        <p>The platform is designed for multiple industries, with flexible provider data and category-specific discovery pages.</p>
      </div>
    </main>
  )
}
