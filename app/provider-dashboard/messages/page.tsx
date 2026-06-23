import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import Link from 'next/link'

export default async function MessagesPage() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { data: threads } = await supabase
    .from('message_threads')
    .select(`
      id, created_at, updated_at,
      service:services(id, title),
      customer:customers(id, name, email),
      messages(id, actor, body, created_at)
    `)
    .eq('provider_id', provider.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  const threadList = (threads ?? []) as {
    id: string
    created_at: string
    updated_at: string
    service: { id: string; title: string } | { id: string; title: string }[] | null
    customer: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null
    messages: { id: string; actor: string; body: string; created_at: string }[]
  }[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conversations with customers. A thread opens automatically when a booking is made.
        </p>
      </div>

      {threadList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No messages yet. Threads appear here when customers book your services.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threadList.map((thread) => {
            const service = Array.isArray(thread.service) ? thread.service[0] : thread.service
            const customer = Array.isArray(thread.customer) ? thread.customer[0] : thread.customer

            const msgs = [...(thread.messages ?? [])].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            const lastMsg = msgs[msgs.length - 1]
            const date = new Date(thread.updated_at).toLocaleDateString('en-ZA', {
              day: 'numeric', month: 'short',
            })

            return (
              <Link
                key={thread.id}
                href={`/provider-dashboard/messages/${thread.id}`}
                className="flex items-start gap-4 rounded-xl border bg-card px-5 py-4 hover:bg-accent/30 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {(customer?.name ?? 'C')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between">
                    <p className="font-medium text-sm">{customer?.name ?? 'Customer'}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    re: {service?.title ?? 'Service'}
                  </p>
                  {lastMsg && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {lastMsg.actor === 'provider' ? 'You: ' : ''}{lastMsg.body}
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
