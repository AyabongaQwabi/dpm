'use server'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { acceptBooking, declineBooking } from '@/lib/actions/provider-bookings'

interface PageProps {
  params: Promise<{ id: string }>
}

async function sendMessage(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('auth_provider_id', user.id)
    .single()

  if (!provider) return

  const threadId = formData.get('threadId') as string
  const body = (formData.get('body') as string).trim()
  if (!body) return

  const { data: thread } = await supabase
    .from('message_threads')
    .select('id')
    .eq('id', threadId)
    .eq('provider_id', provider.id)
    .single()

  if (!thread) return

  const admin = createAdminClient()
  await admin.from('messages').insert({ thread_id: threadId, actor: 'provider', body })
  await admin.from('message_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

  revalidatePath(`/provider-dashboard/messages/${threadId}`)
}

export default async function ThreadPage({ params }: PageProps) {
  const { id: threadId } = await params
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { data: thread } = await supabase
    .from('message_threads')
    .select(`
      id, booking_id,
      service:services!message_threads_service_id_fkey(id, title),
      customer:customers!message_threads_customer_id_fkey(id, name, email),
      messages(id, actor, body, created_at),
      booking:bookings!message_threads_booking_id_fkey(id, status, final_price)
    `)
    .eq('id', threadId)
    .eq('provider_id', provider.id)
    .single()

  if (!thread) notFound()

  const service = Array.isArray(thread.service) ? thread.service[0] : thread.service
  const customer = Array.isArray(thread.customer) ? thread.customer[0] : thread.customer
  const booking = Array.isArray(thread.booking) ? thread.booking[0] : thread.booking
  const showBookingActions = booking?.status === 'requested'

  const messages = [...((thread.messages ?? []) as { id: string; actor: string; body: string; created_at: string }[])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <Link href="/provider-dashboard/messages" className="text-muted-foreground hover:text-foreground text-sm">
          ← Messages
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <div>
          <p className="font-semibold text-sm">{customer?.name ?? 'Customer'}</p>
          <p className="text-xs text-muted-foreground">re: {service?.title ?? 'Service'}</p>
        </div>
      </div>

      {showBookingActions && booking && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium flex-1">New booking request — accept or decline</p>
          <form action={acceptBooking}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
            >
              Accept
            </button>
          </form>
          <form action={declineBooking}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="reason" value="Declined by provider" />
            <button
              type="submit"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
            >
              Decline & refund
            </button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg) => {
          const isProvider = msg.actor === 'provider'
          const time = new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={msg.id} className={`flex ${isProvider ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                isProvider
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm',
              ].join(' ')}>
                <p>{msg.body}</p>
                <p className={[
                  'text-xs mt-1',
                  isProvider ? 'text-primary-foreground/70' : 'text-muted-foreground',
                ].join(' ')}>{time}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-shrink-0 border-t pt-4">
        <form action={sendMessage} className="flex gap-2">
          <input type="hidden" name="threadId" value={threadId} />
          <input
            name="body"
            type="text"
            required
            placeholder="Type a message…"
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
