import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCredits } from '@/lib/format-credits'
import { canonicalAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Booking confirmed',
  alternates: canonicalAlternates('/checkout/confirmation'),
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ bookingId?: string }>
}

export default async function ConfirmationPage({ searchParams }: Props) {
  const { bookingId } = await searchParams
  if (!bookingId) notFound()

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, final_price,
      service:services(id, title),
      provider:providers(id, business_name, slug)
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) notFound()

  const service = Array.isArray(booking.service) ? booking.service[0] : booking.service
  const provider = Array.isArray(booking.provider) ? booking.provider[0] : booking.provider
  const providerSlug = (provider as { slug?: string | null })?.slug ?? provider?.id

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-2">
        {booking.status === 'requested' ? 'Request sent!' : 'Booking confirmed!'}
      </h1>
      <p className="text-muted-foreground mb-2">
        Your request for <span className="font-medium text-foreground">{service?.title}</span> has been
        sent to <span className="font-medium text-foreground">{(provider as { business_name: string })?.business_name}</span>.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        {formatCredits(Number(booking.final_price))} deducted from your wallet.
        They&apos;ll respond shortly — you can chat with them in your messages.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/customer-account"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          View my bookings
        </Link>
        {providerSlug && (
          <Link
            href={`/providers/${providerSlug}`}
            className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
          >
            Back to {(provider as { business_name: string })?.business_name}
          </Link>
        )}
      </div>
    </main>
  )
}
