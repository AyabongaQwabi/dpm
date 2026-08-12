import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { ProBadge } from '@/components/ui/ProBadge'
import { createClient } from '@/lib/supabase/server'
import { getOptionalUser } from '@/lib/session'
import { getProMembership } from '@/lib/actions/pro-membership'
import {
  FREE_TIER_GALLERY_IMAGE_CAP,
  FREE_TIER_SERVICE_LISTING_CAP,
  PACKAGE_NUMBERS_INCLUDING_PRO,
  PRO_CANCELLATION_REFUND_WINDOW_HOURS,
  PRO_GALLERY_IMAGE_CAP,
  PRO_MEMBERSHIP_CONFIG,
} from '@/lib/entitlements'
import { formatCredits } from '@/lib/format-credits'
import { PACKAGES, formatFee } from '@/lib/pricing-config'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, faqPageJsonLd } from '@/lib/seo'

const PRO_TITLE = 'ServicePros Pro'
const PRO_DESCRIPTION =
  'ServicePros Pro is a paid provider membership that unlocks profile, publishing, gallery, analytics, and dashboard tools.'
const BILLING_PATH = '/provider-dashboard/billing'

export const metadata: Metadata = {
  title: PRO_TITLE,
  description: PRO_DESCRIPTION,
  alternates: canonicalAlternates('/pro'),
  robots: { index: true, follow: true },
  openGraph: defaultOpenGraph(PRO_TITLE, PRO_DESCRIPTION, '/pro'),
  twitter: defaultTwitter(PRO_TITLE, PRO_DESCRIPTION),
}

type ProCta = {
  label: string
  href: string
  note: string
}

const toolkit = [
  {
    label: 'Analytics',
    status: 'Coming soon',
    detail: 'Dashboard reporting for profile and content activity once the analytics views are live.',
    icon: Icon.trendingUp,
  },
  {
    label: 'Expanded gallery',
    status: 'Live',
    detail: `Add up to ${PRO_GALLERY_IMAGE_CAP} gallery images instead of the base ${FREE_TIER_GALLERY_IMAGE_CAP}.`,
    icon: Icon.image,
  },
  {
    label: 'Unlimited listings',
    status: 'Live',
    detail: FREE_TIER_SERVICE_LISTING_CAP
      ? `Publish more than the base ${FREE_TIER_SERVICE_LISTING_CAP} active service listings.`
      : 'Publish service listings without the base listing cap.',
    icon: Icon.listChecks,
  },
  {
    label: 'Profile customisation',
    status: 'Live',
    detail: 'Set a profile accent colour, choose a pinned service, and add a custom call-to-action.',
    icon: Icon.palette,
  },
  {
    label: 'Publishing limits',
    status: 'Live',
    detail: 'Keep posts and stories available on the free tier, with higher monthly limits on Pro.',
    icon: Icon.send,
  },
  {
    label: 'Custom URL',
    status: 'Live',
    detail: 'Choose a cleaner provider profile slug when your account is eligible.',
    icon: Icon.link,
  },
  {
    label: 'Team seats',
    status: 'Coming soon',
    detail: 'Invite teammates into provider workflows once team access is ready.',
    icon: Icon.users,
  },
] as const

const faqItems = [
  {
    question: 'Can I cancel Pro?',
    answer:
      `Purchased Pro can be cancelled from Billing. Cancel within ${PRO_CANCELLATION_REFUND_WINDOW_HOURS} hours of purchase and it ends immediately with a full credit refund to your provider wallet. Cancel after that window and Pro features stay active until the paid period ends, with no refund.`,
  },
  {
    question: 'What happens if Pro lapses?',
    answer:
      'The Pro-only tools stop applying after the membership period ends. Your base provider listing remains available through your normal provider plan.',
  },
  {
    question: 'What happens if I downgrade from a package that includes Pro?',
    answer:
      'If your new package does not include Pro, the included Pro source no longer applies. Billing will show the available standalone Pro option.',
  },
  {
    question: 'Does Pro affect reviews or profile order?',
    answer:
      'No. Pro unlocks provider tools. It does not change reviews, verification, commission rates, or where your profile appears in search.',
  },
  {
    question: 'Can I buy Pro before contact verification?',
    answer:
      'No. Complete contact verification first. It is free and can be done from your provider dashboard.',
  },
] as const

async function resolveProCta(): Promise<ProCta> {
  const user = await getOptionalUser()
  if (!user) {
    return {
      label: 'Sign up as provider',
      href: '/provider-signup',
      note: 'Create a provider account first, then manage Pro from Billing.',
    }
  }

  const supabase = await createClient()
  const { data: provider } = await supabase
    .from('providers')
    .select('id, verified_contact')
    .eq('auth_provider_id', user.id)
    .maybeSingle()

  if (!provider) {
    return {
      label: 'Sign up as provider',
      href: '/provider-signup',
      note: 'Finish provider setup before choosing Pro.',
    }
  }

  const [{ data: subscription }, membership] = await Promise.all([
    supabase
      .from('provider_subscriptions')
      .select('package_number, status')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProMembership(provider.id),
  ])

  if (!provider.verified_contact) {
    return {
      label: 'Verify first',
      href: '/provider-dashboard/verification',
      note: 'Contact verification is free and takes a few minutes.',
    }
  }

  const packageNumber = Number(subscription?.package_number ?? 1)
  const hasPackageIncludedPro =
    subscription?.status === 'active' && PACKAGE_NUMBERS_INCLUDING_PRO.includes(packageNumber)

  if (membership?.status === 'active' && membership.source === 'purchased') {
    return {
      label: 'Manage Pro',
      href: BILLING_PATH,
      note: 'Your purchased Pro membership is active.',
    }
  }

  if (membership?.status === 'active' && membership.source === 'granted') {
    return {
      label: 'View billing',
      href: BILLING_PATH,
      note: 'Pro is currently granted on your account.',
    }
  }

  if (hasPackageIncludedPro || (membership?.status === 'active' && membership.source === 'package_included')) {
    return {
      label: 'Pro already included',
      href: BILLING_PATH,
      note: 'Your current provider package includes Pro at no extra cost.',
    }
  }

  if (membership?.status === 'lapsed') {
    return {
      label: 'Reactivate Pro',
      href: BILLING_PATH,
      note: 'Billing will check your wallet balance before reactivation.',
    }
  }

  return {
    label: 'Get Pro',
    href: BILLING_PATH,
    note: 'Purchase uses your provider credit wallet from Billing.',
  }
}

function formatProPrice(value: number | null | undefined, suffix: string): string {
  return typeof value === 'number' && value > 0 ? `${formatCredits(value)} ${suffix}` : 'Coming soon'
}

export default async function ProMarketingPage() {
  const cta = await resolveProCta()
  const basePackage = PACKAGES.find((pkg) => pkg.packageNumber === 1) ?? PACKAGES[0]
  const firstIncludedPackage =
    PACKAGES.find((pkg) => PACKAGE_NUMBERS_INCLUDING_PRO.includes(pkg.packageNumber)) ?? null
  const basePlusProMonthly = basePackage ? basePackage.monthlyFee + PRO_MEMBERSHIP_CONFIG.monthlyFee : null

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Pro', path: '/pro' },
          ]),
          faqPageJsonLd(faqItems.map((item) => ({ question: item.question, answer: item.answer }))),
        ]}
      />

      <main className="bg-background">
        <section className="relative min-h-[620px] overflow-hidden">
          <Image
            src="https://images.pexels.com/photos/8961397/pexels-photo-8961397.jpeg?auto=compress&cs=tinysrgb&w=1800&h=1100&fit=crop"
            alt="Service professional reviewing work details"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/72 to-slate-950/20" />
          <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-20">
            <div className="max-w-2xl text-white">
              <ProBadge size="md" />
              <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
                ServicePros Pro
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
                Pro is a paid ServicePros membership for providers. It unlocks extra tools on your profile and dashboard, while the base provider plan keeps your business listed.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={cta.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-bold text-primary-accent-foreground transition-opacity hover:opacity-90"
                >
                  {cta.label}
                  <Icon.arrowRight className="h-4 w-4" weight="bold" />
                </Link>
                <Link
                  href="/verification"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  Verification
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/70">{cta.note}</p>
            </div>
          </div>
          <p className="absolute bottom-3 right-4 text-[10px] text-white/40">
            Photo: Mikael Blomkvist / Pexels
          </p>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-accent">Monthly</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  {formatProPrice(PRO_MEMBERSHIP_CONFIG.monthlyFee, 'per month')}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-accent">Annual</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  {formatProPrice(PRO_MEMBERSHIP_CONFIG.annualFee, 'per year')}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-accent">Included</p>
                <p className="mt-3 text-lg font-semibold">
                  {firstIncludedPackage ? `${firstIncludedPackage.name} and higher packages` : 'Coming soon'}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Package inclusion comes from the Pro membership config.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary-accent">Toolkit</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">What Pro unlocks</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Pro gives providers more control over profile depth, publishing capacity, and dashboard tools. Items marked coming soon are not active in the product yet.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {toolkit.map((item) => {
              const Glyph = item.icon
              return (
                <div key={item.label} className="rounded-lg border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <Glyph className="h-5 w-5 text-primary-accent" />
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="border-y bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary-accent">Important</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">What Pro is not</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Not verification', 'Pro is separate from contact, Google, CIPC, and FICA verification.'],
                ['Not search placement', 'Pro does not move your profile up or down in search.'],
                ['Not a commission change', 'Pro does not change provider commission rates.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-white/15 bg-white/5 p-5">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary-accent">Pricing</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Standalone Pro or package-included Pro</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-muted-foreground">Base plan plus monthly Pro</p>
                <p className="mt-2 text-2xl font-bold">
                  {basePlusProMonthly ? `${formatFee(basePlusProMonthly)} / month` : 'Coming soon'}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-muted-foreground">First package with Pro included</p>
                <p className="mt-2 text-2xl font-bold">
                  {firstIncludedPackage ? `${formatFee(firstIncludedPackage.monthlyFee)} / month` : 'Coming soon'}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Standalone Pro is debited from your provider credit wallet. Provider credits map to rand value through wallet configuration.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary-accent">Requirement</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Contact verification comes first</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Contact verification is free and takes a few minutes from the provider dashboard. Pro purchase and reactivation wait until that contact check is complete.
            </p>
            <Link
              href="/provider-dashboard/verification"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Verify contact details
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary-accent">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Pro questions</h2>
            <div className="mt-8 divide-y rounded-lg border bg-card">
              {faqItems.map((item) => (
                <details key={item.question} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                    {item.question}
                    <Icon.chevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
