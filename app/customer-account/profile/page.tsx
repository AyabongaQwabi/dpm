import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import {
  updatePersonalDetails,
  updatePassword,
  toggleSavedProvider,
  updateNotificationPreferences,
} from '@/lib/actions/customer'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

type Tab = 'details' | 'security' | 'saved' | 'notifications'
const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Personal details' },
  { id: 'security', label: 'Security' },
  { id: 'saved', label: 'Saved providers' },
  { id: 'notifications', label: 'Notifications' },
]

export default async function AccountProfilePage({ searchParams }: Props) {
  const { tab: rawTab } = await searchParams
  const tab: Tab = (['details', 'security', 'saved', 'notifications'] as Tab[]).includes(rawTab as Tab)
    ? (rawTab as Tab)
    : 'details'

  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  // Get auth user for email (source of truth)
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch saved providers
  const { data: rawSaved } = await supabase
    .from('saved_providers')
    .select('provider_id, provider:providers(id, business_name, slug, profile_image, provider_types(name))')
    .eq('customer_id', customer.id)

  // Fetch notification preferences
  const { data: notifPrefs } = await supabase
    .from('notification_preferences')
    .select('booking_updates_email, messages_email, promotional_email')
    .eq('customer_id', customer.id)
    .single()

  type SavedRow = {
    provider_id: string
    provider: {
      id: string
      business_name: string
      slug: string | null
      profile_image: string | null
      provider_types: { name: string } | { name: string }[] | null
    } | {
      id: string
      business_name: string
      slug: string | null
      profile_image: string | null
      provider_types: { name: string } | { name: string }[] | null
    }[] | null
  }

  function first<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
  }

  const savedProviders = ((rawSaved ?? []) as unknown as SavedRow[]).map((row) => {
    const p = first(row.provider)
    return {
      id: row.provider_id,
      business_name: p?.business_name ?? '',
      slug: p?.slug ?? null,
      profile_image: p?.profile_image ?? null,
      typeName: first(p?.provider_types)?.name ?? null,
    }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Account & Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal details, security, and preferences.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-8 border-b pb-0 flex-wrap">
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            href={`/customer-account/profile?tab=${id}`}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors cursor-pointer',
              tab === id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Personal details */}
      {tab === 'details' && (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar src={null} alt={customer.name} size="lg" shape="circle" />
            <div>
              <p className="font-semibold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? customer.email}</p>
            </div>
          </div>

          <form action={updatePersonalDetails} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={customer.name}
                required
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1.5">Phone number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={customer.phone ?? ''}
                placeholder="+27 XX XXX XXXX"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <input
                type="email"
                value={user?.email ?? customer.email ?? ''}
                disabled
                className="w-full rounded-xl border bg-muted px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save changes
            </button>
          </form>
        </section>
      )}

      {/* Security */}
      {tab === 'security' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-semibold mb-1">Change password</h2>
            <p className="text-sm text-muted-foreground">Choose a strong password of at least 8 characters.</p>
          </div>
          <form action={updatePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-1.5">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              Update password
            </button>
          </form>
        </section>
      )}

      {/* Saved providers */}
      {tab === 'saved' && (
        <section>
          <h2 className="text-base font-semibold mb-4">Saved providers</h2>
          {savedProviders.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground text-sm">No saved providers yet.</p>
              <p className="text-muted-foreground text-sm mt-1">
                Save providers you like to find them quickly later.
              </p>
              <Link
                href="/services"
                className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                Browse services
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savedProviders.map((p) => (
                <div key={p.id} className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4">
                  <Avatar src={p.profile_image} alt={p.business_name} size="sm" shape="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.business_name}</p>
                    {p.typeName && <p className="text-xs text-muted-foreground truncate">{p.typeName}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/providers/${p.slug ?? p.id}`}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      View profile
                    </Link>
                    <form action={toggleSavedProvider}>
                      <input type="hidden" name="providerId" value={p.id} />
                      <input type="hidden" name="action" value="unsave" />
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <section>
          <h2 className="text-base font-semibold mb-1">Email notifications</h2>
          <p className="text-sm text-muted-foreground mb-6">Choose what you&apos;d like to receive by email.</p>

          <form action={updateNotificationPreferences} className="space-y-4">
            {[
              { name: 'booking_updates_email', label: 'Booking updates', description: 'Status changes, confirmations, and reminders.' },
              { name: 'messages_email', label: 'Messages', description: 'New messages from providers.' },
              { name: 'promotional_email', label: 'Promotions & tips', description: 'Special offers and platform news.' },
            ].map(({ name, label, description }) => {
              const defaultChecked =
                name === 'booking_updates_email'
                  ? (notifPrefs?.booking_updates_email ?? true)
                  : name === 'messages_email'
                  ? (notifPrefs?.messages_email ?? true)
                  : (notifPrefs?.promotional_email ?? false)

              return (
                <label key={name} className="flex items-start gap-4 rounded-xl border bg-card px-5 py-4 cursor-pointer hover:bg-accent/30 transition-colors">
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={defaultChecked}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </label>
              )
            })}
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save preferences
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
