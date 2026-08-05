import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminSession } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { RejectClaimButton, ForceUnclaimButton } from '@/components/admin/ClaimActionButtons'

export const metadata: Metadata = {
  title: 'Claim review — ServicePros Admin',
  robots: { index: false, follow: false },
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function AdminClaimsPage() {
  await requireAdminSession()
  const admin = createAdminClient()

  const [{ data: pendingClaims }, { data: unclaimedProviders }, { data: recentClaims }] =
    await Promise.all([
      admin
        .from('profile_claims')
        .select('id, provider_id, claimant_email, code_expires_at, status, created_at, providers(id, business_name, slug, location_city, location_state)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      admin
        .from('providers')
        .select('id, business_name, slug, location_city, location_state, is_scraped, scraped_at')
        .eq('claim_status', 'unclaimed')
        .order('scraped_at', { ascending: false })
        .limit(50),
      admin
        .from('profile_claims')
        .select('id, provider_id, claimant_email, status, verified_at, created_at, providers(id, business_name, slug)')
        .in('status', ['verified', 'rejected', 'expired'])
        .order('created_at', { ascending: false })
        .limit(30),
    ])

  const pending = pendingClaims ?? []
  const unclaimed = unclaimedProviders ?? []
  const recent = recentClaims ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Claim review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pending ownership claims, unclaimed scraped listings, and recent claim history.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Pending verification ({pending.length})
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          These claimants have started a claim. They self-verify via emailed code — no admin
          action required unless a claim looks fraudulent.
        </p>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {pending.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">No pending claims.</p>
          )}
          {pending.map((claim) => {
            const provider = Array.isArray(claim.providers) ? claim.providers[0] : claim.providers
            if (!provider) return null
            const location = [provider.location_city, provider.location_state].filter(Boolean).join(', ')
            const expired = new Date(claim.code_expires_at) < new Date()
            return (
              <div key={claim.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/providers/${provider.slug ?? provider.id}`}
                      target="_blank"
                      className="font-medium text-foreground hover:underline truncate"
                    >
                      {provider.business_name}
                    </Link>
                    {expired && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        code expired
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {location && `${location} · `}
                    claimant: {claim.claimant_email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Started {formatDate(claim.created_at)}
                  </p>
                </div>
                <RejectClaimButton claimId={claim.id} />
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Unclaimed listings ({unclaimed.length})
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Scraped profiles nobody has started claiming yet. Most recently scraped first.
        </p>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {unclaimed.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">No unclaimed listings.</p>
          )}
          {unclaimed.map((provider) => {
            const location = [provider.location_city, provider.location_state].filter(Boolean).join(', ')
            return (
              <div key={provider.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/providers/${provider.slug ?? provider.id}`}
                    target="_blank"
                    className="font-medium text-foreground hover:underline truncate"
                  >
                    {provider.business_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{location || '—'}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {provider.scraped_at ? `scraped ${formatDate(provider.scraped_at)}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Recent history
        </h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {recent.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">No claim history yet.</p>
          )}
          {recent.map((claim) => {
            const provider = Array.isArray(claim.providers) ? claim.providers[0] : claim.providers
            if (!provider) return null
            return (
              <div key={claim.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/providers/${provider.slug ?? provider.id}`}
                    target="_blank"
                    className="font-medium text-foreground hover:underline truncate"
                  >
                    {provider.business_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{claim.claimant_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                      (claim.status === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : claim.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground')
                    }
                  >
                    {claim.status}
                  </span>
                  {claim.status === 'verified' && (
                    <ForceUnclaimButton providerId={provider.id} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
