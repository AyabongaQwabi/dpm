import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupportEmail, POLICY_LAST_UPDATED, POLICY_VERSION } from '@/lib/policy-content'
import { canonicalAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Service Pros terms of service — Namoota Technology credit marketplace.',
  alternates: canonicalAlternates('/terms'),
  robots: { index: false, follow: true },
}

export default async function TermsPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Terms</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Terms of service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {POLICY_LAST_UPDATED} · Version {POLICY_VERSION}
      </p>

      <div className="mt-8 space-y-6 leading-8 text-muted-foreground">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the Service Pros platform operated
          by Namoota Technology, as a <strong className="text-foreground">customer</strong> booking
          services on the marketplace. If you are a service provider listing your business on
          ServicePros, your account is also governed by our{' '}
          <Link href="/provider-terms" className="text-primary hover:underline">Provider Terms</Link>,
          which cover subscription billing, commission, and listing standards. By creating an account or
          using the platform, you agree to these Terms.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Eligibility</h2>
          <p className="mt-3">
            You must be at least 18 years old and resident in the Republic of South Africa to use Service Pros.
            An account is required to book services or list as a provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Marketplace role</h2>
          <p className="mt-3">
            Service Pros is an online marketplace that connects customers with independent service providers.
            Namoota Technology is not a party to the contract between a customer and a provider for the
            underlying service. Providers are solely responsible for the quality, safety, and legality of
            their services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Credit system</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>Credits are purchased from Namoota Technology via Yoco. 1 credit = R1 (one South African Rand).</li>
            <li>Credits have no cash value, are non-transferable between accounts, and cannot be withdrawn as cash.</li>
            <li>Credits are deducted from your wallet when you confirm a booking.</li>
            <li>Unused credits remain in your wallet until spent on a future booking, subject to these Terms.</li>
            <li>Namoota Technology may adjust credit pack pricing and purchase limits with reasonable notice.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Bookings</h2>
          <p className="mt-3">
            When you book a service, credits are committed immediately. Providers may accept or decline
            requested bookings. If a booking is cancelled before work begins (by you or the provider) or
            auto-expires without acceptance, credits are returned to your wallet — not as a cash refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
          <p className="mt-3">
            Reviews may only be submitted after a booking is marked completed. Reviews must be honest and
            relate to the service received. We may remove reviews that violate our content standards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Provider obligations</h2>
          <p className="mt-3">
            Providers must provide accurate listings, honour stated delivery timelines, comply with applicable
            laws and licences, and respond to booking requests in a timely manner. Providers receive payout
            from Namoota Technology after customer confirmation of completion, minus platform commission.
            Full provider obligations — subscription billing, commission brackets, ceiling packages, and
            listing standards — are set out in our{' '}
            <Link href="/provider-terms" className="text-primary hover:underline">Provider Terms</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Prohibited conduct</h2>
          <p className="mt-3">
            You may not use the platform for fraud, harassment, illegal services, circumvention of platform
            fees, scraping, or any activity that harms other users or the integrity of the marketplace.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Suspension and termination</h2>
          <p className="mt-3">
            We may suspend or terminate accounts that violate these Terms or pose a risk to the platform.
            Upon termination, unused credits may be handled per our Refund Policy and applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Limitation of liability</h2>
          <p className="mt-3">
            To the fullest extent permitted by law, Namoota Technology is not liable for indirect, incidental,
            or consequential damages arising from use of the platform or services booked through it. Our total
            liability is limited to the credits you paid for the specific booking giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Governing law</h2>
          <p className="mt-3">
            These Terms are governed by the laws of the Republic of South Africa. Disputes are subject to the
            exclusive jurisdiction of South African courts, without prejudice to your statutory rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            Questions about these Terms:{' '}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
