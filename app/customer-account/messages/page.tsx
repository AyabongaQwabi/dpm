import Link from 'next/link'
import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { BookingStatusBadge } from '@/components/customer-account/BookingStatusBadge'
import { Avatar } from '@/components/ui/Avatar'

export default async function CustomerMessagesPage() {
  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  const { data: threads } = await supabase
    .from('message_threads')
    .select(`
      id, created_at, updated_at,
      service:services(id, title),
      provider:providers(id, business_name, slug, profile_image),
      booking:bookings(id, status, cancellation_reason),
      messages(id, actor, body, created_at)
    `)
    .eq('customer_id', customer.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  type RawThread = {
    id: string; created_at: string; updated_at: string
    service: { id: string; title: string } | { id: string; title: string }[] | null
    provider: { id: string; business_name: string; slug: string | null; profile_image: string | null } | { id: string; business_name: string; slug: string | null; profile_image: string | null }[] | null
    booking: { id: string; status: string; cancellation_reason: string | null } | { id: string; status: string; cancellation_reason: string | null }[] | null
    messages: { id: string; actor: string; body: string; created_at: string }[]
  }

  function first<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
  }

  const threadList = ((threads ?? []) as unknown as RawThread[]).map((t) => ({
    ...t,
    service: first(t.service),
    provider: first(t.provider),
    booking: first(t.booking),
    messages: [...(t.messages ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conversations with providers. A thread opens when you book a service.
        </p>
      </div>

      {threadList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No messages yet.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Book a service and a private thread with the provider will appear here.
          </p>
          <Link
            href="/services"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            Browse services
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {threadList.map((thread) => {
            const lastMsg = thread.messages[thread.messages.length - 1]
            const date = new Date(thread.updated_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
            const isCustomer = lastMsg?.actor === 'customer'

            return (
              <Link
                key={thread.id}
                href={`/customer-account/messages/${thread.id}`}
                className="flex items-start gap-4 rounded-xl border bg-card px-5 py-4 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <Avatar
                  src={thread.provider?.profile_image ?? null}
                  alt={thread.provider?.business_name ?? 'Provider'}
                  size="sm"
                  shape="rounded"
                  className="flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{thread.provider?.business_name ?? 'Provider'}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    re: {thread.service?.title ?? 'Service'}
                  </p>
                  {thread.booking && (
                    <div className="mt-1">
                      <BookingStatusBadge status={thread.booking.status} cancellationReason={thread.booking.cancellation_reason} />
                    </div>
                  )}
                  {lastMsg && (
                    <p className="text-sm text-muted-foreground mt-1.5 truncate">
                      {isCustomer ? 'You: ' : `${thread.provider?.business_name ?? 'Provider'}: `}
                      {lastMsg.body}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
