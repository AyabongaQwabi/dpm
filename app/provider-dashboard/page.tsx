import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import { ServicesNudge } from '@/components/provider-dashboard/ServicesNudge'
import { SinglePlayerToolkit } from '@/components/provider-dashboard/SinglePlayerToolkit'
import { daysRemaining, getPackageByNumber } from '@/lib/domain/subscriptions'
import { profileCompleteness } from '@/lib/domain/profile-completeness'
import { hasEntitlement } from '@/lib/actions/pro-membership'
import { ENTITLEMENT_KEYS } from '@/lib/entitlements'
import { loadProviderAnalyticsSummary } from '@/lib/provider-analytics'
import { providerHasPrintEligibility } from '@/lib/domain/print-kit'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://servicepros.co.za').replace(/\/$/, '')

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export default async function ProviderDashboardHome() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const [
    { data: subscription },
    { data: providerProfile },
    { data: services },
    { count: bookingCount },
    { count: messageCount },
    canViewAnalytics,
  ] = await Promise.all([
    supabase
      .from('provider_subscriptions')
      .select('package_number, billing_end, status')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('providers')
      .select(`
        id,
        slug,
        business_name,
        bio,
        profile_image,
        gallery,
        faqs,
        location_city,
        phone,
        is_published,
        claim_status,
        verified_contact,
        verified_google,
        verified_cipc,
        verified_fica
      `)
      .eq('id', provider.id)
      .maybeSingle(),
    supabase
      .from('services')
      .select('id, title, is_published, created_at')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', provider.id),
    supabase
      .from('message_threads')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', provider.id),
    hasEntitlement(provider.id, ENTITLEMENT_KEYS.ANALYTICS),
  ])
  const analytics = await loadProviderAnalyticsSummary({ providerId: provider.id, canViewAnalytics })

  const pkg = getPackageByNumber(subscription?.package_number ?? 1)
  const remaining = subscription ? daysRemaining(subscription.billing_end) : null
  const billingWarning =
    subscription?.status === 'expired'
    || (subscription?.status === 'active' && remaining !== null && remaining <= 3)

  const serviceRows = (services ?? []) as { id: string; title: string; is_published: boolean }[]
  const serviceCount = serviceRows.length
  const hasServices = serviceCount > 0
  const profile = providerProfile ?? {
    id: provider.id,
    slug: null,
    business_name: provider.business_name,
    bio: null,
    profile_image: null,
    gallery: [],
    faqs: [],
    location_city: null,
    phone: null,
    is_published: provider.is_published,
    claim_status: 'claimed',
    verified_contact: false,
    verified_google: false,
    verified_cipc: false,
    verified_fica: false,
  }
  const profilePath = `/providers/${profile.slug ?? profile.id}`
  const profileUrl = `${PUBLIC_SITE_URL}${profilePath}`
  const completeness = profileCompleteness({
    isPublished: Boolean(profile.is_published),
    businessName: profile.business_name,
    bio: profile.bio,
    profileImage: profile.profile_image,
    locationCity: profile.location_city,
    phone: profile.phone,
    serviceCount,
    galleryCount: countArray(profile.gallery),
    faqCount: countArray(profile.faqs),
    verificationCount: [
      profile.verified_contact,
      profile.verified_google,
      profile.verified_cipc,
      profile.verified_fica,
    ].filter(Boolean).length,
  })
  const printKitEligible = providerHasPrintEligibility(profile)

  return (
    <div>
      {/* Post-onboarding nudge — client component, dismissible */}
      <ServicesNudge hasServices={hasServices} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Growth Hub</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {provider.business_name || 'there'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {provider.is_published
              ? 'Your profile is live. Share it, track interest, and help customers book with less back-and-forth.'
              : 'Publish your profile to unlock share links, profile tracking, QR downloads, and customer booking paths.'}
          </p>
        </div>

        <Link
          href="/provider-dashboard/billing"
          className={`mb-6 block rounded-2xl border px-5 py-4 shadow-sm transition-colors hover:bg-accent/20 ${
            billingWarning ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-card'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{pkg.name} plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subscription
                  ? subscription.status === 'expired'
                    ? 'Subscription expired — renew to stay visible'
                    : `${remaining} days until renewal`
                  : 'Set up billing'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-accent">
              Billing
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/provider-dashboard/services"
            className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-accent/30"
          >
            <p className="text-2xl font-bold">{serviceCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Services</p>
          </Link>
          <Link
            href="/provider-dashboard/sales"
            className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-accent/30"
          >
            <p className="text-2xl font-bold">{bookingCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Bookings</p>
          </Link>
          <Link
            href="/provider-dashboard/messages"
            className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-accent/30"
          >
            <p className="text-2xl font-bold">{messageCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Conversations</p>
          </Link>
        </div>

        <SinglePlayerToolkit
          providerId={provider.id}
          businessName={profile.business_name}
          profilePath={profilePath}
          profileUrl={profileUrl}
          services={serviceRows.map((service) => ({
            id: service.id,
            title: service.title,
            isPublished: service.is_published,
            url: `${PUBLIC_SITE_URL}/services/${service.id}`,
          }))}
          completeness={completeness}
          analytics={analytics}
          printKitEligible={printKitEligible}
        />
      </div>
    </div>
  )
}
