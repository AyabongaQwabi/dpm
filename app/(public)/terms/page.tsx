import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'ServicePros terms of use.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Terms</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Terms of use</h1>
      <div className="mt-8 space-y-5 leading-8 text-muted-foreground">
        <p>These placeholder terms describe acceptable use of the marketplace while final legal copy is prepared.</p>
        <p>Users are responsible for the accuracy of information they submit. Providers are responsible for their services, pricing, and availability.</p>
        <p>ServicePros may update, moderate, or remove content to protect marketplace quality and safety.</p>
      </div>
    </main>
  )
}
