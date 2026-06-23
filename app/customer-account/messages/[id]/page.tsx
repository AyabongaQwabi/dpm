import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { BookingStatusBadge } from '@/components/customer-account/BookingStatusBadge'
import { sendCustomerMessage } from '@/lib/actions/customer'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerThreadPage({ params }: PageProps) {
  const { id: threadId } = await params
  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  const { data: thread } = await supabase
    .from('message_threads')
    .select(`
      id,
      service:services(id, title),
      provider:providers(id, business_name, slug, profile_image),
      booking:bookings(id, status, cancellation_reason),
      messages(id, actor, body, created_at)
    `)
    .eq('id', threadId)
    .eq('customer_id', customer.id)
    .single()

  if (!thread) notFound()

  const service = Array.isArray(thread.service) ? thread.service[0] : thread.service
  const provider = Array.isArray(thread.provider) ? thread.provider[0] : thread.provider
  const booking = Array.isArray(thread.booking) ? thread.booking[0] : thread.booking

  const messages = [...((thread.messages ?? []) as { id: string; actor: string; body: string; created_at: string }[])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/customer-account/messages"
            className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
          >
            ← Messages
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div>
            <p className="font-semibold text-sm">{provider?.business_name ?? 'Provider'}</p>
            <p className="text-xs text-muted-foreground">re: {service?.title ?? 'Service'}</p>
          </div>
        </div>
        {booking && (
          <BookingStatusBadge status={booking.status} cancellationReason={booking.cancellation_reason} />
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            No messages yet. Send the first one below.
          </p>
        )}
        {messages.map((msg) => {
          const isCustomer = msg.actor === 'customer'
          const time = new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
              <div
                className={[
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  isCustomer
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm',
                ].join(' ')}
              >
                <p>{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isCustomer ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {time}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send form */}
      <form action={sendCustomerMessage} className="flex gap-2 flex-shrink-0">
        <input type="hidden" name="threadId" value={threadId} />
        <input
          name="body"
          type="text"
          placeholder="Type a message…"
          required
          className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )
}
