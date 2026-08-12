import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { getSupportEmail } from '@/lib/policy-content'
import { getContactDetails } from '@/lib/contact-details-config'
import {
  breadcrumbJsonLd,
  canonicalAlternates,
  contactPageJsonLd,
  defaultOpenGraph,
  defaultTwitter,
  organizationJsonLd,
} from '@/lib/seo'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Contact Namoota Technology and ServicePros — supplier details, support routes for customers and providers, and our POPIA Information Officer.',
  alternates: canonicalAlternates('/contact'),
  openGraph: defaultOpenGraph('Contact us', 'Contact Namoota Technology and ServicePros for support, billing, and provider queries.', '/contact'),
  twitter: defaultTwitter('Contact us', 'Contact Namoota Technology and ServicePros for support, billing, and provider queries.'),
}

export default async function ContactPage() {
  const supportEmail = await getSupportEmail()
  const contactDetails = getContactDetails()

  const CONTACT_ROUTES = [
    {
      reason: 'General enquiry',
      description: 'Questions about ServicePros, the marketplace, or your account.',
      email: contactDetails.routes.generalEnquiry,
    },
    {
      reason: 'Provider support',
      description: 'Help with your provider dashboard, listing, or verification.',
      email: contactDetails.routes.providerSupport,
    },
    {
      reason: 'Billing and payments',
      description: 'Subscription billing, credit purchases, or payout queries.',
      email: contactDetails.routes.billing,
    },
    {
      reason: 'Report a problem with a provider',
      description: 'Raise a dispute or report misrepresentation by a listed provider.',
      email: contactDetails.routes.disputes,
    },
    {
      reason: 'Media and partnerships',
      description: 'Press enquiries, platform partner and referral agent applications.',
      email: contactDetails.routes.media,
    },
  ] as const

  const jsonLd = organizationJsonLd(
    CONTACT_ROUTES.map((route) => ({
      contactType: route.reason,
      email: route.email,
    })),
    {
      legalName: 'Namoota Technology (Pty) Ltd',
      telephone: '+27603116777',
      address: {
        streetAddress: '152 Company Street, Muckleneuk',
        addressLocality: 'Pretoria',
        addressRegion: 'Gauteng',
        postalCode: '0002',
      },
    },
  )
  const contactPageLd = contactPageJsonLd('/contact')

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
          jsonLd,
          contactPageLd,
        ]}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Contact</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
        Full supplier details and the right route for your enquiry, in line with the Electronic
        Communications and Transactions Act (ECTA) requirement to disclose who operates this platform.
      </p>

      {/* Legal disclosure panel — ECTA s43 */}
      <section className="mt-12 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Supplier details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Statutory disclosure of who operates this platform, per section 43 of the Electronic
          Communications and Transactions Act.
        </p>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-foreground">Full legal name</dt>
            <dd className="mt-1 text-sm text-muted-foreground">Namoota Technology (Pty) Ltd</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Physical address</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              152 Company Street<br />Muckleneuk<br />Pretoria<br />Gauteng<br />0002
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Postal address</dt>
            <dd className="mt-1 text-sm text-muted-foreground">Same as physical address.</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Email</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Phone</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              <a href="tel:+27603116777" className="text-primary hover:underline">+27 60 311 6777</a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-foreground">Person responsible for this site</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {contactDetails.siteResponsiblePerson.name} —{' '}
              <a
                href={`mailto:${contactDetails.siteResponsiblePerson.email}`}
                className="text-primary hover:underline"
              >
                {contactDetails.siteResponsiblePerson.email}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {/* Contact routes by reason */}
      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold">Get in touch by reason</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choosing the right route helps us get to your query faster.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CONTACT_ROUTES.map((route) => (
            <div key={route.reason} className="rounded-2xl border bg-card p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon.mail className="h-4 w-4" weight="duotone" />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold">{route.reason}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{route.description}</p>
              <p className="mt-3 text-sm">
                <a href={`mailto:${route.email}`} className="text-primary hover:underline">{route.email}</a>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Response time */}
      <section className="mt-12 rounded-2xl border bg-muted/30 p-6">
        <h2 className="font-display text-base font-semibold">Response time</h2>
        <p className="mt-2 text-sm text-muted-foreground">{contactDetails.responseTime}</p>
      </section>

      {/* POPIA Information Officer — a distinct statutory role from general contact */}
      <section className="mt-8 rounded-2xl border bg-muted/30 p-6">
        <h2 className="font-display text-base font-semibold">POPIA Information Officer</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A separate statutory role from general contact, required under the Protection of Personal
          Information Act, 2013.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-foreground">Name</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{contactDetails.popiaInformationOfficer.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Contact</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              <a
                href={`mailto:${contactDetails.popiaInformationOfficer.email}`}
                className="text-primary hover:underline"
              >
                {contactDetails.popiaInformationOfficer.email}
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
