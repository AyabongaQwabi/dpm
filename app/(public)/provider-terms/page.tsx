import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupportEmail, PROVIDER_TERMS_LAST_UPDATED, PROVIDER_TERMS_VERSION } from '@/lib/policy-content'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'
import { COMMISSION_BRACKETS, COMMISSION_STACKING_FLOOR, PACKAGES, formatFee, formatRate } from '@/lib/pricing-config'
import { TodoPlaceholder } from '@/components/TodoPlaceholder'

export const metadata: Metadata = {
  title: 'Provider terms',
  description:
    'Terms governing the provider relationship with ServicePros: subscription billing, commission, ceiling packages, the credit wallet, price-change moderation, and account standards.',
  alternates: canonicalAlternates('/provider-terms'),
  openGraph: defaultOpenGraph(
    'Provider terms',
    'The full terms governing your provider account, billing, commission, and listing standards on ServicePros.',
    '/provider-terms',
  ),
  twitter: defaultTwitter(
    'Provider terms',
    'The full terms governing your provider account, billing, commission, and listing standards on ServicePros.',
  ),
}

const ceilingPackages = PACKAGES.filter((pkg) => pkg.ceilingRate !== null)
const basePackage = PACKAGES[0]

export default async function ProviderTermsPage() {
  const supportEmail = await getSupportEmail()

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Provider terms</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Provider terms</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {PROVIDER_TERMS_LAST_UPDATED} · Version {PROVIDER_TERMS_VERSION}
      </p>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
        These terms govern your relationship with Namoota Technology as a listed provider on ServicePros.
        They sit alongside our general{' '}
        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>, which covers
        customer-facing conduct on the platform.
      </p>

      <div className="mt-10 space-y-8 leading-8 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Subscription billing</h2>
          <p className="mt-3">
            Every provider account carries a monthly subscription fee, billed in advance. The base
            plan is {formatFee(basePackage.monthlyFee)} per month. {basePackage.planDetail}
          </p>
          <p className="mt-3">
            If a subscription payment fails or lapses, your profile stops appearing in search and category
            results until the subscription is renewed. Renewing restores visibility; it does not restore
            time lost while the subscription was inactive.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Commission on completed work</h2>
          <p className="mt-3">
            Commission is charged only on completed, paid bookings — never on enquiries, quotes, or
            messages. The rate depends on the value of the individual sale:
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Sale value</th>
                  <th className="px-4 py-2 font-medium">Commission rate</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_BRACKETS.map((bracket) => (
                  <tr key={bracket.label} className="border-t">
                    <td className="px-4 py-2">{bracket.label}</td>
                    <td className="px-4 py-2">{formatRate(bracket.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Commission is deducted from your payout after the customer confirms the booking is complete.
            The effective rate can never fall below {formatRate(COMMISSION_STACKING_FLOOR)}, even where a
            ceiling package, a Discount 4 Discount bonus, and a temporary reduction all apply to the same
            sale.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Ceiling packages</h2>
          <p className="mt-3">
            A ceiling package caps the commission rate on every sale above {formatFee(COMMISSION_BRACKETS[0].max)},
            regardless of which bracket the sale would otherwise fall into. Subscribing to a ceiling
            package replaces the base plan; the monthly fee is higher, and the cap applies automatically
            to qualifying sales.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Package</th>
                  <th className="px-4 py-2 font-medium">Monthly fee</th>
                  <th className="px-4 py-2 font-medium">Commission ceiling</th>
                </tr>
              </thead>
              <tbody>
                {ceilingPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-t">
                    <td className="px-4 py-2">{pkg.name}</td>
                    <td className="px-4 py-2">{formatFee(pkg.monthlyFee)}</td>
                    <td className="px-4 py-2">{formatRate(pkg.ceilingRate as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Discount 4 Discount bonus and temporary reductions</h2>
          <p className="mt-3">
            Ceiling package subscribers may qualify for a Discount 4 Discount (D4D) bonus, which further
            reduces the effective commission rate on top of the package ceiling, and time-limited
            temporary reductions offered as account perks. Both are floored by the{' '}
            {formatRate(COMMISSION_STACKING_FLOOR)} stacking floor described above — they cannot combine
            to push commission below that level.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">The credit wallet</h2>
          <p className="mt-3">
            Customers pay for bookings using credits purchased from Namoota Technology, where 1 credit
            equals R1. Your payout for a completed booking is calculated from the credit value of the
            sale, less commission, and paid out according to the platform&apos;s payout schedule.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Price-change moderation</h2>
          <p className="mt-3">
            Changes to a listed service price are reviewed against moderation bands to protect customers
            from sudden, unexplained price swings and to protect providers from being undercut by
            manipulated pricing:
          </p>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>Increases up to 5% apply immediately.</li>
            <li>Increases from 5% up to 9.5% may require a short review.</li>
            <li>Increases from 9.5% up to 25% require review before taking effect.</li>
            <li>Increases from 25% up to 50% require review and may need supporting justification.</li>
            <li>
              Services flagged as high demand (3 or more active bookings) are subject to closer review at
              every band.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Account review and suspension</h2>
          <p className="mt-3">
            We may review or suspend a provider account for conduct that violates these terms, misleads
            customers, circumvents platform fees, or poses a risk to the marketplace. Where possible, we
            will notify you and give you an opportunity to respond before suspension.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Listing content standards</h2>
          <p className="mt-3">
            Listings must accurately describe the business, the services offered, and the provider&apos;s
            location and availability. Images and descriptions must belong to the provider or be used with
            permission. Misleading claims, fabricated reviews, or copied content from another provider are
            prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Verification</h2>
          <p className="mt-3">
            Providers may complete contact, CIPC, and FICA verification independently. A listing may also
            be marked Google verified automatically, where ServicePros has matched it to a business
            confirmed by Google Places — this isn&apos;t something you apply for. See{' '}
            <Link href="/verification" className="text-primary hover:underline">how verification works</Link>{' '}
            for what each level requires. Verification status is displayed on your public listing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Termination and data on termination</h2>
          <p className="mt-3">
            You may close your provider account at any time from your dashboard. On termination, your
            listing is removed from public search and category pages. Booking history, payout records, and
            any data required for tax, accounting, or legal purposes are retained per our{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{' '}
            and applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Governing law</h2>
          <p className="mt-3">
            <TodoPlaceholder>legal review — confirm governing law clause</TodoPlaceholder>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Dispute forum</h2>
          <p className="mt-3">
            <TodoPlaceholder>legal review — confirm dispute resolution forum</TodoPlaceholder>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Limitation of liability</h2>
          <p className="mt-3">
            <TodoPlaceholder>legal review — confirm binding limitation of liability language</TodoPlaceholder>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Notice periods</h2>
          <p className="mt-3">
            <TodoPlaceholder>legal review — confirm notice periods for changes to these terms and for account actions</TodoPlaceholder>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            Questions about these provider terms:{' '}
            <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>,
            or see our full <Link href="/contact" className="text-primary hover:underline">contact details</Link>.
          </p>
        </section>
      </div>
    </main>
  )
}
