import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'ServicePros privacy policy.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Privacy</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Privacy policy</h1>
      <div className="mt-8 space-y-5 leading-8 text-muted-foreground">
        <p>This placeholder privacy policy explains the intended data posture for the first public marketplace iteration.</p>
        <p>The app may process profile data, service data, customer account details, content posts, and analytics needed to operate the marketplace.</p>
        <p>Production legal review should finalize retention, deletion, third-party processing, and regional privacy obligations.</p>
      </div>
    </main>
  )
}
