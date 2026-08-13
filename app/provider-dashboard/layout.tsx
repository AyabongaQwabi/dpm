// Provider dashboard layout — sidebar navigation.
// Auth: session-only check here (no Provider row required) to avoid redirect
// loops for new sign-ups completing onboarding.
// Each guarded page calls requireProviderSession() itself.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/provider-dashboard/DashboardSidebar'
import { PolicyLinks } from '@/components/PolicyLinks'
import { SubscriptionBanner } from '@/components/provider-dashboard/SubscriptionBanner'
import { daysRemaining } from '@/lib/domain/subscriptions'

const RENEWAL_WARNING_DAYS = 3

export default async function ProviderDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: provider } = await supabase
    .from('providers')
    .select('id, business_name, slug, is_published, profile_image')
    .eq('auth_provider_id', user.id)
    .single()

  let subscriptionBannerStatus: 'expired' | 'expiring' | null = null
  let subscriptionDaysRemaining = 0

  if (provider) {
    const { data: subscription } = await supabase
      .from('provider_subscriptions')
      .select('status, billing_end')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscription?.status === 'expired') {
      subscriptionBannerStatus = 'expired'
    } else if (subscription?.status === 'active') {
      const remaining = daysRemaining(subscription.billing_end)
      if (remaining <= RENEWAL_WARNING_DAYS) {
        subscriptionBannerStatus = 'expiring'
        subscriptionDaysRemaining = remaining
      }
    }
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/" className="font-display font-bold text-primary text-lg tracking-tight">
            ServicePros
          </Link>
          <span className="text-muted-foreground/40 text-lg">·</span>
          <span className="font-medium text-sm truncate max-w-xs text-foreground/80">
            {provider?.business_name || 'My dashboard'}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {provider?.is_published && (
              <Link
                href={`/providers/${provider.slug ?? provider.id}`}
                target="_blank"
                className="hidden sm:inline-flex text-xs border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors"
              >
                View profile ↗
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <SubscriptionBanner status={subscriptionBannerStatus} daysRemaining={subscriptionDaysRemaining} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <DashboardSidebar hasProvider={!!provider} />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      <footer className="border-t bg-background px-4 py-4">
        <PolicyLinks />
      </footer>
    </div>
  )
}
