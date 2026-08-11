import Link from 'next/link'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TIER_META, type VerificationTier } from '@/components/ui/VerifiedBadge'
import { ContactVerificationCard } from '@/components/provider-dashboard/ContactVerificationCard'
import { Icon } from '@/components/ui/Icon'

const TIER_ORDER: VerificationTier[] = ['contact', 'google', 'cipc', 'fica']

export default async function ProviderVerificationPage() {
  const { provider, authUserId } = await requireProviderSession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: providerRow } = await supabase
    .from('providers')
    .select('verified_contact, verified_google, verified_cipc, verified_fica')
    .eq('id', provider.id)
    .single()

  const { data: userData } = await admin.auth.admin.getUserById(authUserId)
  const email = userData?.user?.email ?? ''

  const { data: pendingCode } = await supabase
    .from('contact_verifications')
    .select('id')
    .eq('provider_id', provider.id)
    .eq('status', 'pending')
    .maybeSingle()

  const status: Record<VerificationTier, boolean> = {
    contact: providerRow?.verified_contact ?? false,
    google: providerRow?.verified_google ?? false,
    cipc: providerRow?.verified_cipc ?? false,
    fica: providerRow?.verified_fica ?? false,
  }

  return (
    <div className="max-w-3xl px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified providers get a badge on their listing. See how each tier works on the{' '}
          <Link href="/verification" className="underline hover:text-foreground" target="_blank">
            verification guide
          </Link>
          .
        </p>
      </div>

      <div className="space-y-4">
        {TIER_ORDER.map((tier) => {
          const meta = TIER_META[tier]
          const Glyph = meta.icon
          const isVerified = status[tier]

          return (
            <section key={tier} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${meta.className}`}>
                    <Glyph className="h-4 w-4" weight="fill" />
                    {meta.label}
                  </span>
                </div>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shrink-0">
                    <Icon.verified className="h-3 w-3" weight="fill" />
                    Verified
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{meta.description}</p>

              <div className="mt-4">
                {tier === 'contact' && !isVerified && (
                  <ContactVerificationCard
                    email={email}
                    alreadyVerified={isVerified}
                    hasPendingCode={!!pendingCode}
                  />
                )}

                {tier === 'google' && !isVerified && (
                  <p className="text-sm text-muted-foreground">
                    Added automatically when we match your profile to a Google Places business listing. No action needed.
                  </p>
                )}

                {tier === 'cipc' && !isVerified && (
                  <p className="text-sm text-muted-foreground">
                    Document upload and review is coming soon. In the meantime,{' '}
                    <Link href="/contact" className="underline hover:text-foreground">contact support</Link>{' '}
                    to submit your CIPC registration details.
                  </p>
                )}

                {tier === 'fica' && !isVerified && (
                  <p className="text-sm text-muted-foreground">
                    Document upload and review is coming soon. In the meantime,{' '}
                    <Link href="/contact" className="underline hover:text-foreground">contact support</Link>{' '}
                    to submit your FICA documents.
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
