import type { Metadata } from 'next'
import { requireProviderSession } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadProviderPlan } from '@/lib/provider-plan'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/seo'
import { WidgetGenerator } from '@/components/provider-dashboard/WidgetGenerator'

export const metadata: Metadata = {
  title: 'Widgets',
  robots: { index: false, follow: false },
}

const STATS_WINDOW_DAYS = 7

/** Isolates the impure Date.now() call outside the component render body (react-hooks/purity). */
function statsWindowStart(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export default async function WidgetsPage() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  // Same base-plan gate as the widget's own public rendering
  // (provider_subscriptions.status = 'active') — not Pro/entitlement-gated.
  // The widget is meant to be a broadly available acquisition tool, so the
  // generator that produces it should be too.
  const { subscription } = await loadProviderPlan(supabase, provider.id, { activeOnly: true })

  if (!subscription) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-3">Widgets</h1>
        <div className="rounded-xl border bg-amber-50 border-amber-200 px-5 py-4 text-sm text-amber-900">
          <p className="font-medium">Widgets need an active subscription</p>
          <p className="mt-1">
            Your embeddable widget stops working while your subscription is inactive. Renew your
            subscription to generate and use widgets.
          </p>
        </div>
      </main>
    )
  }

  // Minimal, always-visible widget performance — not the full Prompt-03
  // analytics dashboard (which is Pro-gated for peer comparison/ranges).
  // "Is the widget I installed doing anything" is basic product feedback
  // for an acquisition tool, not a premium insight — gating it would leave
  // non-Pro providers with zero signal on whether to keep their widget.
  const admin = createAdminClient()
  const since = statsWindowStart(STATS_WINDOW_DAYS)
  const { data: recentEvents } = await admin
    .from('funnel_events')
    .select('event_type, origin_domain')
    .eq('provider_id', provider.id)
    .in('event_type', ['embed_view', 'embed_interaction'])
    .gte('created_at', since)

  const loads = (recentEvents ?? []).filter((e) => e.event_type === 'embed_view').length
  const clicks = (recentEvents ?? []).filter((e) => e.event_type === 'embed_interaction').length
  const domainCounts = new Map<string, number>()
  for (const event of recentEvents ?? []) {
    if (!event.origin_domain) continue
    domainCounts.set(event.origin_domain, (domainCounts.get(event.origin_domain) ?? 0) + 1)
  }
  const byOriginDomain = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => ({ domain, count }))

  return (
    <WidgetGenerator
      providerId={provider.id}
      siteUrl={SITE_URL}
      stats={{ windowDays: STATS_WINDOW_DAYS, loads, clicks, byOriginDomain }}
    />
  )
}
