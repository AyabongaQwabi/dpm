import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import { ServicesNudge } from '@/components/provider-dashboard/ServicesNudge'
import Link from 'next/link'

export default async function ProviderDashboardHome() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { count: serviceCount } = await supabase
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)

  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)

  const { count: messageCount } = await supabase
    .from('message_threads')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)

  const hasServices = (serviceCount ?? 0) > 0

  return (
    <div>
      {/* Post-onboarding nudge — client component, dismissible */}
      <ServicesNudge hasServices={hasServices} />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {provider.business_name || 'there'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {provider.is_published ? 'Your profile is live.' : 'Your profile is not yet published.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/provider-dashboard/services"
            className="rounded-xl border bg-card px-5 py-5 hover:bg-accent/30 transition-colors"
          >
            <p className="text-2xl font-bold">{serviceCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Services</p>
          </Link>
          <Link
            href="/provider-dashboard/sales"
            className="rounded-xl border bg-card px-5 py-5 hover:bg-accent/30 transition-colors"
          >
            <p className="text-2xl font-bold">{bookingCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Bookings</p>
          </Link>
          <Link
            href="/provider-dashboard/messages"
            className="rounded-xl border bg-card px-5 py-5 hover:bg-accent/30 transition-colors"
          >
            <p className="text-2xl font-bold">{messageCount ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Conversations</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
