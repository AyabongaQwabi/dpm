import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { initiateClaim } from '@/lib/actions/claims'
import { getFeaturePauseMessage } from '@/lib/feature-pauses'
import { PausedFeatureNotice } from '@/components/PausedFeatureNotice'

interface ClaimPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ paused?: string }>
}

export const metadata: Metadata = {
  title: 'Claim your business profile',
  robots: { index: false, follow: false },
}

async function getClaimableProvider(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select('id, slug, business_name, location_city, location_state, claim_status, bio')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .in('claim_status', ['unclaimed', 'claim_pending'])
    .single()
  return data
}

export default async function ClaimPage({ params, searchParams }: ClaimPageProps) {
  const { slug } = await params
  const { paused } = await searchParams
  const provider = await getClaimableProvider(slug)
  if (!provider) notFound()

  const profileSlug = provider.slug ?? provider.id
  const location = [provider.location_city, provider.location_state].filter(Boolean).join(', ')

  async function submitClaim(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '')
    await initiateClaim(profileSlug, email)
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      {paused && <PausedFeatureNotice message={getFeaturePauseMessage('profileClaiming')} />}
      <Link href={`/providers/${profileSlug}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to profile
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold text-foreground">Claim this business</h1>
      <p className="mt-2 text-muted-foreground">
        Verify ownership of <strong>{provider.business_name}</strong>
        {location ? ` in ${location}` : ''}.
      </p>
      {provider.bio && (
        <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {provider.bio}
        </p>
      )}
      <form action={submitClaim} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Business email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@yourbusiness.co.za"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            We&apos;ll send a 6-digit verification code to this address.
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Send verification code
        </button>
      </form>
    </main>
  )
}
