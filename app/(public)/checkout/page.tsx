import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { DiscountType, ServiceType } from '@/lib/db'

export const metadata: Metadata = { title: 'Checkout' }

interface Props {
  searchParams: Promise<{ serviceId?: string; packageId?: string }>
}

function effectivePrice(price: number, type: DiscountType, amount: number | null): number {
  if (type === 'none' || amount === null) return price
  if (type === 'amount') return price - amount
  return price * (1 - amount / 100)
}

async function createBooking(formData: FormData) {
  'use server'
  const serviceId = formData.get('serviceId') as string
  const packageId = formData.get('packageId') as string
  const notes = formData.get('notes') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/checkout?serviceId=${serviceId}&packageId=${packageId}`)

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_customer_id', user.id)
    .single()

  if (!customer) redirect('/sign-in')

  const { data: service } = await supabase
    .from('services')
    .select('id, provider_id, service_type')
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

  const pricePaid = effectivePrice(
    Number(pkg.price),
    pkg.discount_type as DiscountType,
    pkg.discount_amount,
  )

  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .insert({
      service_id: serviceId,
      provider_id: service.provider_id,
      customer_id: customer.id,
      package_id: packageId,
      price_paid: pricePaid,
      status: 'requested',
      payment_status: 'pending',
      notes: notes || null,
    })
    .select('id')
    .single()

  if (!booking) redirect(`/services/${serviceId}`)

  // Create a message thread so provider + customer can communicate
  await admin.from('message_threads').insert({
    provider_id: service.provider_id,
    customer_id: customer.id,
    service_id: serviceId,
    booking_id: booking.id,
  }).select().single()

  revalidatePath('/customer-account')
  revalidatePath('/provider-dashboard/messages')
  revalidatePath('/provider-dashboard/sales')

  redirect(`/checkout/confirmation?bookingId=${booking.id}`)
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { serviceId, packageId } = await searchParams

  if (!serviceId || !packageId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/checkout?serviceId=${serviceId}&packageId=${packageId}`)

  const [{ data: service }, { data: pkg }] = await Promise.all([
    supabase
      .from('services')
      .select(`
        id, title, description, image, service_type,
        provider:providers!inner(id, business_name, slug)
      `)
      .eq('id', serviceId)
      .eq('is_published', true)
      .single(),
    supabase
      .from('service_packages')
      .select('id, name, description, price, discount_type, discount_amount, delivery_time, offerings')
      .eq('id', packageId)
      .eq('service_id', serviceId)
      .single(),
  ])

  if (!service || !pkg) notFound()

  const provider = Array.isArray(service.provider) ? service.provider[0] : service.provider
  const serviceType = service.service_type as ServiceType
  const ctaVerb = serviceType === 'time_based' ? 'Confirm booking' : 'Place order'
  const priceFinal = effectivePrice(
    Number(pkg.price),
    pkg.discount_type as DiscountType,
    pkg.discount_amount,
  )
  const hasDiscount = pkg.discount_type !== 'none' && pkg.discount_amount !== null
  const offerings = Array.isArray(pkg.offerings) ? pkg.offerings as string[] : []
  const providerSlug = (provider as { slug?: string | null })?.slug ?? provider.id

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
          <span className="font-medium">Total</span>
          <div className="text-right">
            <span className="text-xl font-bold">R {priceFinal.toFixed(2)}</span>
            {hasDiscount && (
              <p className="text-xs line-through text-muted-foreground">R {Number(pkg.price).toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Booking form */}
      <form action={createBooking} className="space-y-5">
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="packageId" value={packageId} />

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

        <p className="text-xs text-muted-foreground">
          Your booking request will be sent to {(provider as { business_name: string }).business_name}.
          You&apos;ll be able to chat and confirm details in your messages once they accept.
        </p>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {ctaVerb}
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
