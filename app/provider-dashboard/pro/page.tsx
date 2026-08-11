import Link from 'next/link'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { getProMembership, hasEntitlement } from '@/lib/actions/pro-membership'
import { updateProfileCustomisation, updateCustomSlug } from '@/lib/actions/pro-profile'
import { ENTITLEMENT_KEYS } from '@/lib/entitlements'
import { ProBadge } from '@/components/ui/ProBadge'
import { Icon } from '@/components/ui/Icon'
import { ProfileCoverImageUpload } from '@/components/provider-dashboard/ProfileCoverImageUpload'
import { FormSubmitButton } from '@/components/provider-dashboard/FormSubmitButton'

interface ProPageProps {
  searchParams: Promise<{ profileError?: string; profileSaved?: string; slugError?: string; slugSaved?: string }>
}

const SLUG_ERRORS: Record<string, string> = {
  format: 'That slug isn’t valid — use lowercase letters, numbers, and hyphens only, 3–60 characters.',
  reserved: 'That slug is reserved and can’t be used.',
  taken: 'That slug is already in use — try another.',
  save_failed: 'Something went wrong saving your slug. Try again.',
}

const PROFILE_ERRORS: Record<string, string> = {
  service: 'That pinned service could not be saved. Choose one of your services and try again.',
  cover_save_failed: 'We could not save the cover image. Please try uploading it again.',
  save_failed: 'Something went wrong saving your profile customisation. Try again.',
}

export default async function ProDashboardPage({ searchParams }: ProPageProps) {
  const { provider } = await requireProviderSession()
  const { profileError, profileSaved, slugError, slugSaved } = await searchParams
  const supabase = await createClient()

  const membership = await getProMembership(provider.id)
  const isPro = membership?.status === 'active'

  const [canCustomise, canCustomSlug] = await Promise.all([
    hasEntitlement(provider.id, ENTITLEMENT_KEYS.PROFILE_CUSTOMISATION),
    hasEntitlement(provider.id, ENTITLEMENT_KEYS.CUSTOM_SLUG),
  ])

  const { data: providerRow } = await supabase
    .from('providers')
    .select('slug, verified_contact, accent_color, pinned_service_id, cta_label, cta_target_url')
    .eq('id', provider.id)
    .single()

  const { data: coverRow } = await supabase
    .from('providers')
    .select('cover_image')
    .eq('id', provider.id)
    .maybeSingle()

  const { data: coverFieldRow } = await supabase
    .from('provider_field_values')
    .select('value, field:fields!inner(key)')
    .eq('provider_id', provider.id)
    .eq('field.key', 'profile_cover_image')
    .maybeSingle()
  const coverField = Array.isArray(coverFieldRow?.field) ? coverFieldRow.field[0] : coverFieldRow?.field
  const coverFieldValue = coverField?.key === 'profile_cover_image' && typeof coverFieldRow?.value === 'string'
    ? coverFieldRow.value
    : null
  const coverImage = ((coverRow as { cover_image?: string | null } | null)?.cover_image ?? coverFieldValue) ?? null

  const { data: services } = await supabase
    .from('services')
    .select('id, title')
    .eq('provider_id', provider.id)
    .order('title', { ascending: true })

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Pro membership</h1>
        {isPro && <ProBadge size="md" />}
      </div>
      <Link href="/pro" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        Read the public Pro overview
        <Icon.arrowRight className="h-4 w-4" weight="bold" />
      </Link>

      {!isPro && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have an active Pro membership. Billing now manages wallet balance, Pro purchase,
            cancellation, and transaction history in one place.
          </p>
          <Link
            href="/provider-dashboard/billing"
            className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Manage billing and Pro
          </Link>
        </section>
      )}

      {profileSaved && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          Profile customisation saved.
        </p>
      )}

      {slugSaved && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          Profile URL saved.
        </p>
      )}

      {/* ---- pro.profile_customisation ---- */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Icon.sparkle className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Profile customisation</h2>
        </div>
        {!canCustomise ? (
          <p className="mt-3 text-sm text-muted-foreground">Requires an active Pro membership.</p>
        ) : (
          <form action={updateProfileCustomisation} className="mt-4 space-y-4">
            {profileSaved && (
              <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                Profile customisation saved.
              </p>
            )}
            {profileError && PROFILE_ERRORS[profileError] && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {PROFILE_ERRORS[profileError]}
              </p>
            )}
            <div>
              <label htmlFor="accentColor" className="text-sm font-medium text-foreground">Accent colour</label>
              <input
                type="color"
                id="accentColor"
                name="accentColor"
                defaultValue={providerRow?.accent_color ?? '#14684F'}
                className="mt-1 block h-10 w-20 cursor-pointer rounded-md border border-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cover image</label>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown across the top of your public provider profile.
              </p>
              <div className="mt-2">
                <ProfileCoverImageUpload currentImage={coverImage} />
              </div>
            </div>
            <div>
              <label htmlFor="pinnedServiceId" className="text-sm font-medium text-foreground">Pinned service</label>
              <select
                id="pinnedServiceId"
                name="pinnedServiceId"
                defaultValue={providerRow?.pinned_service_id ?? ''}
                className="mt-1 block w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {(services ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ctaLabel" className="text-sm font-medium text-foreground">Custom CTA label</label>
                <input
                  type="text"
                  id="ctaLabel"
                  name="ctaLabel"
                  maxLength={40}
                  defaultValue={providerRow?.cta_label ?? ''}
                  placeholder="Get a quote"
                  className="mt-1 block w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="ctaTargetUrl" className="text-sm font-medium text-foreground">Custom CTA link</label>
                <input
                  type="url"
                  id="ctaTargetUrl"
                  name="ctaTargetUrl"
                  defaultValue={providerRow?.cta_target_url ?? ''}
                  placeholder="https://"
                  className="mt-1 block w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
            </div>
            <FormSubmitButton pendingLabel="Saving customisation...">
              Save customisation
            </FormSubmitButton>
          </form>
        )}
      </section>

      {/* ---- pro.custom_slug ---- */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Icon.sparkle className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Custom profile URL</h2>
        </div>
        {!canCustomSlug ? (
          <p className="mt-3 text-sm text-muted-foreground">Requires an active Pro membership.</p>
        ) : (
          <form action={updateCustomSlug} className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-mono">servicepros.co.za/providers/{providerRow?.slug}</span>
            </p>
            {slugError && SLUG_ERRORS[slugError] && (
              <p className="text-sm text-destructive">{SLUG_ERRORS[slugError]}</p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono">/providers/</span>
              <input
                type="text"
                name="slug"
                required
                minLength={3}
                maxLength={60}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="your-business-name"
                className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Old links keep working — they&apos;ll redirect to your new URL automatically.
            </p>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Update URL
            </button>
          </form>
        )}
      </section>

      {/* Posts & Stories are free for every provider — Pro only raises the
          caps (pro.publishing_limits), so they're not gated in this section. */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Icon.sparkle className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Posts & Stories</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Every provider can publish posts and stories to their profile.
          {isPro ? ' Your Pro membership raises your monthly post and live-story limits.' : ' Pro raises your monthly post and live-story limits.'}
        </p>
        <Link
          href="/provider-dashboard/posts"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Go to composer
        </Link>
      </section>
    </div>
  )
}
