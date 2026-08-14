import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { BookingSource, DiscountType, ServiceType } from '@/lib/db'
import { calculateBookingCommission } from '@/lib/commission-context'
import { canAfford, shortfall } from '@/lib/domain/credits'
import { formatCredits } from '@/lib/format-credits'
import type { ServicePricing } from '@/lib/domain/payments'
import { canonicalAlternates } from '@/lib/seo'
import { RequirementsPreview } from '@/components/booking/RequirementsPreview'
import { createBookingWithCredits } from '@/lib/actions/booking-creation'
import { normalizeOriginDomain } from '@/lib/domain/embed'

export const metadata: Metadata = {
  title: 'Checkout',
  alternates: canonicalAlternates('/checkout'),
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ serviceId?: string; packageId?: string; source?: string; originDomain?: string }>
}

function sourceQueryString(source: string | undefined, originDomain: string | undefined): string {
  if (source !== 'embed') return ''
  const normalized = normalizeOriginDomain(originDomain ?? null)
  return `&source=embed${normalized ? `&originDomain=${encodeURIComponent(normalized)}` : ''}`
}

async function createBooking(formData: FormData) {
  'use server'
  const serviceId = formData.get('serviceId') as string
  const packageId = formData.get('packageId') as string
  const notes = (formData.get('notes') as string | null)?.trim() || null
  const rawSource = formData.get('source') as string | null
  const source: BookingSource = rawSource === 'embed' ? 'embed' : 'site'
  const originDomain = source === 'embed'
    ? normalizeOriginDomain(formData.get('originDomain') as string | null)
    : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = `/checkout?serviceId=${serviceId}&packageId=${packageId}${sourceQueryString(rawSource ?? undefined, originDomain ?? undefined)}`
    redirect(`/sign-in?next=${encodeURIComponent(next)}`)
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id, credit_balance')
    .eq('auth_provider_id', user.id)
    .single()

  if (!customer) redirect('/sign-in')

  const { data: service } = await supabase
    .from('services')
    .select('id, provider_id, title')
    .eq('id', serviceId)
    .eq('is_published', true)
    .single()

  if (!service) redirect('/')

  const { data: pkg } = await supabase
    .from('service_packages')
    .select('id, price, discount_type, discount_amount')
    .eq('id', packageId)
    .eq('service_id', serviceId)
    .single()

  if (!pkg) redirect(`/services/${serviceId}`)

  const pricing: ServicePricing = {
    price: Number(pkg.price),
    discountType: pkg.discount_type as DiscountType,
    discountAmount: pkg.discount_amount !== null ? Number(pkg.discount_amount) : null,
  }

  const commission = await calculateBookingCommission(
    supabase,
    service.provider_id,
    packageId,
    pricing,
  )

  const spendCredits = Math.round(commission.finalPrice)

  if (!canAfford(customer.credit_balance, spendCredits)) {
    const gap = shortfall(customer.credit_balance, spendCredits)
    redirect(`/customer-account/credits?amount=${gap}`)
  }

  const booking = await createBookingWithCredits({
    customerId: customer.id,
    customerCreditBalance: customer.credit_balance,
    providerId: service.provider_id,
    serviceId,
    packageId,
    notes,
    commission,
    description: `Booking: ${service.title}`,
    source,
    originDomain,
  })

  if (!booking.ok) {
    const gap = booking.reason === 'insufficient_credits'
      ? booking.shortfall
      : shortfall(customer.credit_balance, spendCredits)
    redirect(`/customer-account/credits?amount=${gap}`)
  }

  redirect(`/customer-account/bookings/${booking.bookingId}`)
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { serviceId, packageId, source: rawSource, originDomain: rawOriginDomain } = await searchParams

  if (!serviceId || !packageId) notFound()

  const source: BookingSource = rawSource === 'embed' ? 'embed' : 'site'
  const originDomain = source === 'embed' ? normalizeOriginDomain(rawOriginDomain ?? null) : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = `/checkout?serviceId=${serviceId}&packageId=${packageId}${sourceQueryString(rawSource, rawOriginDomain)}`
    redirect(`/sign-in?next=${encodeURIComponent(next)}`)
  }

  const [{ data: customer }, { data: service }, { data: pkg }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, credit_balance')
      .eq('auth_provider_id', user.id)
      .single(),
    supabase
      .from('services')
      .select(`
        id, title, description, image, service_type,
        provider:providers!services_provider_id_fkey!inner(id, business_name, slug, is_published)
      `)
      .eq('id', serviceId)
      .eq('is_published', true)
      .eq('provider.is_published', true)
      .single(),
    supabase
      .from('service_packages')
      .select('id, name, description, price, discount_type, discount_amount, delivery_time, offerings, requirements, requirement_file_slots')
      .eq('id', packageId)
      .eq('service_id', serviceId)
      .single(),
  ])

  if (!service || !pkg || !customer) notFound()

  const provider = Array.isArray(service.provider) ? service.provider[0] : service.provider
  const serviceType = service.service_type as ServiceType
  const ctaVerb = serviceType === 'time_based' ? 'Confirm booking' : 'Place order'

  const pricing: ServicePricing = {
    price: Number(pkg.price),
    discountType: pkg.discount_type as DiscountType,
    discountAmount: pkg.discount_amount !== null ? Number(pkg.discount_amount) : null,
  }

  const commission = await calculateBookingCommission(
    supabase,
    (provider as { id: string }).id,
    packageId,
    pricing,
  )

  const priceFinal = Math.round(commission.finalPrice)
  const balance = customer.credit_balance ?? 0
  const affordable = canAfford(balance, priceFinal)
  const gap = shortfall(balance, priceFinal)
  const hasDiscount = pkg.discount_type !== 'none' && pkg.discount_amount !== null
  const offerings = Array.isArray(pkg.offerings) ? pkg.offerings as string[] : []
  const providerSlug = (provider as { slug?: string | null })?.slug ?? (provider as { id: string }).id

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <nav className="text-sm text-muted-foreground mb-8 flex items-center gap-1.5">
        <Link href={`/services/${serviceId}`} className="hover:underline">
          {service.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Checkout</span>
      </nav>

      <h1 className="text-2xl font-bold mb-8">Review your order</h1>

      {/* Wallet balance */}
      <div className="rounded-xl border bg-card px-5 py-4 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Your balance</p>
          <p className="font-semibold">{formatCredits(balance)}</p>
        </div>
        <Link
          href="/customer-account/credits"
          className="text-xs text-primary hover:underline"
        >
          Buy credits
        </Link>
      </div>

      {!affordable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6 text-sm text-amber-900">
          <p className="font-medium">Insufficient credits</p>
          <p className="mt-1">
            You need {formatCredits(gap)} more to complete this booking.
          </p>
          <Link
            href={`/customer-account/credits?amount=${gap}`}
            className="inline-block mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Top up {formatCredits(gap)}
          </Link>
        </div>
      )}

      {/* Order summary card */}
      <div className="rounded-2xl border p-6 mb-8 space-y-4">
        <div className="flex items-start gap-4">
          {service.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.image} alt={service.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">
              by{' '}
              <Link href={`/providers/${providerSlug}`} className="hover:underline">
                {(provider as { business_name: string }).business_name}
              </Link>
            </p>
            <h2 className="font-semibold">{service.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{pkg.name} package</p>
          </div>
        </div>

        {pkg.delivery_time && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Delivery:</span> {pkg.delivery_time}
          </p>
        )}

        {offerings.length > 0 && (
          <ul className="space-y-1">
            {offerings.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <svg className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4 flex items-center justify-between">
          <span className="font-medium">This booking</span>
          <div className="text-right">
            <span className="text-xl font-bold">{formatCredits(priceFinal)}</span>
            {hasDiscount && (
              <p className="text-xs line-through text-muted-foreground">
                {formatCredits(Number(pkg.price))}
              </p>
            )}
          </div>
        </div>
      </div>

      <form action={createBooking} className="space-y-5">
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="packageId" value={packageId} />
        {source === 'embed' && <input type="hidden" name="source" value="embed" />}
        {originDomain && <input type="hidden" name="originDomain" value={originDomain} />}

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes for the provider <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Any specific requirements, dates, or questions…"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-y"
          />
        </div>

        {/* Requirements repeated compactly above confirm-and-pay, so nobody
            is surprised by what they owe after credits leave their wallet. */}
        <RequirementsPreview
          compact
          requirements={pkg.requirements}
          requirementFileSlots={pkg.requirement_file_slots}
        />

        <p className="text-xs text-muted-foreground">
          Credits will be deducted immediately when you confirm. Your booking request will be sent to{' '}
          {(provider as { business_name: string }).business_name}.
        </p>

        <button
          type="submit"
          disabled={!affordable}
          className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {affordable ? ctaVerb : `Need ${formatCredits(gap)} more`}
        </button>

        <Link
          href={`/services/${serviceId}`}
          className="block text-center text-sm text-muted-foreground hover:underline"
        >
          Back to service
        </Link>
      </form>
    </main>
  )
}
