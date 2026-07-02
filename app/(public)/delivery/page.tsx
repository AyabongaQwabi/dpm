import type { Metadata } from 'next'
import { getSupportEmail, POLICY_LAST_UPDATED } from '@/lib/policy-content'
import { canonicalAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Delivery Policy',
  description: 'Service Pros delivery policy for marketplace services.',
  alternates: canonicalAlternates('/delivery'),
  robots: { index: false, follow: true },
}

export default async function DeliveryPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Delivery</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Delivery policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {POLICY_LAST_UPDATED}</p>

      <div className="mt-8 space-y-6 leading-8 text-muted-foreground">
        <p>
          Service Pros is a services marketplace — not a product store. &quot;Delivery&quot; means the
          completion of a booked service by an independent provider, not shipment of physical goods.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Provider-set timelines</h2>
          <p className="mt-3">
            Each service listing includes a delivery time or timeframe set by the provider (for example,
            &quot;3 business days&quot; or &quot;Same day&quot;). You should review this before booking.
            The stated timeline begins after the provider accepts your booking and any required information
            has been exchanged.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Booking and fulfilment flow</h2>
          <ol className="mt-3 list-decimal pl-6 space-y-2">
            <li>You book a service and credits are deducted from your wallet.</li>
            <li>The provider accepts or declines the request.</li>
            <li>Once accepted, you and the provider coordinate details via messages.</li>
            <li>The provider delivers the service per their listing and agreed terms.</li>
            <li>You confirm completion in your account, which triggers the provider payout process.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Delays</h2>
          <p className="mt-3">
            If a provider is running late or you have not heard from them, message them through the platform
            first. If the issue is not resolved, contact Namoota Technology at{' '}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>.
            We will assist with mediation but are not responsible for provider-caused delays.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Digital and on-site services</h2>
          <p className="mt-3">
            Services may be delivered remotely (online consultations, digital deliverables) or on-site at
            your location. The provider&apos;s listing and package description specify what is included.
            Travel, materials, or additional fees beyond the listed credit price must be agreed in writing
            before work begins.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Namoota Technology&apos;s role</h2>
          <p className="mt-3">
            Namoota Technology facilitates discovery, booking, payment via credits, and dispute support.
            We do not perform the underlying services and do not guarantee provider availability or
            timelines. Providers are independent businesses responsible for their own delivery commitments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            Delivery questions or disputes:{' '}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
