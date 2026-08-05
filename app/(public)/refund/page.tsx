import type { Metadata } from 'next'
import { getSupportEmail, POLICY_LAST_UPDATED } from '@/lib/policy-content'
import { canonicalAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Service Pros refund policy — credits, not cash.',
  alternates: canonicalAlternates('/refund'),
  robots: { index: false, follow: true },
}

export default async function RefundPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Refunds</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Refund policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {POLICY_LAST_UPDATED}</p>

      <div className="mt-8 space-y-6 leading-8 text-muted-foreground">
        <p>
          Service Pros uses a credit-based payment model operated by Namoota Technology. This policy explains
          how refunds work for credit purchases and bookings. <strong className="text-foreground">We do not
          issue cash refunds for bookings</strong> — eligible refunds are returned to your credit wallet.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Credit purchases</h2>
          <p className="mt-3">
            Credits purchased via Yoco are generally non-refundable as cash. Once credits are added to
            your wallet, they can be used for future bookings on the platform. If you believe a credit
            purchase was made in error or duplicated, contact us within 7 days with your payment reference.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Booking refunds (credit wallet)</h2>
          <p className="mt-3">Full credit refunds are issued to your wallet when:</p>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>You cancel a booking while it is still in <em>requested</em> status (before the provider accepts).</li>
            <li>A provider declines your booking request.</li>
            <li>A booking request auto-expires because the provider did not respond within the platform timeout.</li>
          </ul>
          <p className="mt-3">
            Refunded credits appear in your wallet and transaction history. The booking&apos;s payment status
            is updated to <em>refunded</em>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Disputes after acceptance</h2>
          <p className="mt-3">
            If you dispute a booking after a provider has accepted it, credits are <strong className="text-foreground">not
            automatically refunded</strong> because work may have commenced. Contact support to explain your
            situation. Namoota Technology may, at its discretion, issue a partial or full credit refund after
            review — but never a cash refund to your bank account or card.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Consumer Protection Act exception</h2>
          <p className="mt-3">
            Nothing in this policy limits your statutory rights under the Consumer Protection Act 68 of 2008
            (CPA). Where the CPA entitles you to a cash refund for a defective transaction or direct marketing
            purchase outside the credit-wallet model, that statutory right applies. Credit purchases and
            marketplace bookings are subject to the CPA&apos;s general protections, including the right to
            fair and honest dealing and to lodge complaints with the National Consumer Commission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How to request a refund review</h2>
          <ol className="mt-3 list-decimal pl-6 space-y-2">
            <li>Email <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a> with your account email and booking ID.</li>
            <li>Describe the issue and any supporting evidence (messages, photos, etc.).</li>
            <li>Our team will respond within 5 business days with a decision or request for further information.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Provider payouts</h2>
          <p className="mt-3">
            Provider earnings are paid by Namoota Technology after customer confirmation of completion.
            Provider payout disputes are handled separately — contact support with your booking reference.
          </p>
        </section>
      </div>
    </main>
  )
}
