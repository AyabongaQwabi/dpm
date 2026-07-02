import type { Metadata } from 'next'
import { getSupportEmail, POLICY_LAST_UPDATED } from '@/lib/policy-content'
import { canonicalAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Service Pros privacy policy — Namoota Technology.',
  alternates: canonicalAlternates('/privacy'),
  robots: { index: false, follow: true },
}

export default async function PrivacyPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Privacy</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {POLICY_LAST_UPDATED}</p>

      <div className="mt-8 space-y-6 leading-8 text-muted-foreground">
        <p>
          Namoota Technology (&quot;we&quot;, &quot;us&quot;) operates the Service Pros marketplace platform.
          This policy explains how we collect, use, and protect your personal information in accordance
          with the Protection of Personal Information Act, 2013 (POPIA).
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Information we collect</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>Account details: name, email address, phone number, and password (stored securely via Supabase Auth).</li>
            <li>Profile and listing data: business name, bio, location, service descriptions, images, and pricing.</li>
            <li>Booking and messaging data: booking requests, notes, message threads, and reviews.</li>
            <li>Payment data: credit purchases are processed by Paystack. We store transaction references and wallet balances; we do not store full card numbers.</li>
            <li>Technical data: device type, browser, IP address, and usage analytics needed to operate and secure the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How we use your information</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>To create and manage your account and authenticate you.</li>
            <li>To facilitate bookings between customers and providers, including credit wallet operations.</li>
            <li>To send transactional communications about bookings, messages, and account activity.</li>
            <li>To improve search, ranking, fraud prevention, and platform safety.</li>
            <li>To comply with legal obligations and respond to lawful requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Sharing your information</h2>
          <p className="mt-3">
            We share information only as needed to operate the marketplace: booking details with the relevant
            provider or customer for fulfilment, payment processing with Paystack, and infrastructure
            providers that host our services. We do not sell your personal information.
          </p>
          <p className="mt-3">
            Paystack maintains its own privacy policy for payment data:{' '}
            <a href="https://paystack.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              paystack.com/privacy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
          <p className="mt-3">
            We use essential cookies and similar technologies for authentication, session management, and
            security. Analytics cookies may be used to understand how the platform is used. You can control
            non-essential cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Your rights under POPIA</h2>
          <p className="mt-3">You have the right to:</p>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>Request access to the personal information we hold about you.</li>
            <li>Request correction of inaccurate or incomplete information.</li>
            <li>Request deletion of your information, subject to legal and contractual retention requirements.</li>
            <li>Object to processing where permitted by law.</li>
            <li>Lodge a complaint with the Information Regulator of South Africa.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Retention and security</h2>
          <p className="mt-3">
            We retain personal information for as long as your account is active and as required for legal,
            tax, and dispute-resolution purposes. We implement appropriate technical and organisational
            measures to protect your data, including encryption in transit and access controls.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            For privacy requests or questions, contact Namoota Technology at{' '}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
