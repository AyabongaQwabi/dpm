'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireCustomerSession, requireProviderSession } from '@/lib/session'
import {
  CUSTOM_QUOTE_MAX_LINE_ITEMS,
  CUSTOM_QUOTE_MIN_LINE_ITEMS,
  CUSTOM_QUOTE_VALIDITY_DAYS,
} from '@/lib/platform-config'
import {
  defaultQuoteValidityDate,
  normaliseQuoteLineItems,
} from '@/lib/domain/custom-quotes'
import { calculateQuoteBookingCommission } from '@/lib/commission-context'
import { createBookingWithCredits } from '@/lib/actions/booking-creation'
import { sendCustomQuoteReadyEmail } from '@/lib/custom-quote-emails'

export type CreateQuoteRequestResult =
  | { ok: true; quoteRequestId: string }
  | { ok: false; error: string }

export async function createQuoteRequest(
  formData: FormData,
): Promise<CreateQuoteRequestResult> {
  const { customer } = await requireCustomerSession()
  const serviceId = (formData.get('serviceId') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim()

  if (!serviceId) return { ok: false, error: 'Choose a service.' }
  if (!description) return { ok: false, error: 'Describe what you need quoted.' }

  const supabase = await createClient()
  const { data: service } = await supabase
    .from('services')
    .select(`
      id,
      provider_id,
      accepts_custom_quotes,
      is_published,
      provider:providers!services_provider_id_fkey!inner(id, is_published)
    `)
    .eq('id', serviceId)
    .eq('is_published', true)
    .eq('provider.is_published', true)
    .maybeSingle()

  const provider = Array.isArray(service?.provider)
    ? service?.provider[0]
    : service?.provider

  if (!service || !provider?.is_published || !service.accepts_custom_quotes) {
    return { ok: false, error: 'This service is not accepting custom quotes.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('quote_requests')
    .insert({
      customer_id: customer.id,
      provider_id: service.provider_id,
      service_id: service.id,
      description,
      status: 'requested',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Quote request insert failed:', error?.message)
    return { ok: false, error: 'Could not send your quote request.' }
  }

  revalidatePath('/customer-account')
  revalidatePath('/provider-dashboard')

  return { ok: true, quoteRequestId: data.id }
}

export type IssueQuoteResult =
  | { ok: true; quoteId: string }
  | { ok: false; error: string }

export async function issueCustomQuote(formData: FormData): Promise<IssueQuoteResult> {
  const { provider } = await requireProviderSession()
  const quoteRequestId = (formData.get('quoteRequestId') as string | null)?.trim()
  const lineItemsRaw = formData.get('lineItemsJson') as string | null
  const validityDate =
    (formData.get('validityDate') as string | null)?.trim() ||
    defaultQuoteValidityDate(CUSTOM_QUOTE_VALIDITY_DAYS)
  const termsText = ((formData.get('termsText') as string | null) ?? '').trim()

  if (!quoteRequestId) return { ok: false, error: 'Quote request not found.' }
  if (!lineItemsRaw) return { ok: false, error: 'Add at least one line item.' }

  let rawItems: unknown
  try {
    rawItems = JSON.parse(lineItemsRaw)
  } catch {
    return { ok: false, error: 'Quote line items are invalid.' }
  }

  const lineItems = normaliseQuoteLineItems({
    rawItems,
    minItems: CUSTOM_QUOTE_MIN_LINE_ITEMS,
    maxItems: CUSTOM_QUOTE_MAX_LINE_ITEMS,
  })
  if (!lineItems.ok || !lineItems.lineItems || !lineItems.totalAmount) {
    return { ok: false, error: lineItems.error ?? 'Quote line items are invalid.' }
  }

  const validUntil = new Date(`${validityDate}T00:00:00.000Z`)
  if (Number.isNaN(validUntil.getTime())) {
    return { ok: false, error: 'Choose a valid quote expiry date.' }
  }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('quote_requests')
    .select(`
      id,
      status,
      provider_id,
      service:services!quote_requests_service_id_fkey(id, accepts_custom_quotes)
    `)
    .eq('id', quoteRequestId)
    .eq('provider_id', provider.id)
    .maybeSingle()

  const service = Array.isArray(request?.service)
    ? request?.service[0]
    : request?.service

  if (!request || request.provider_id !== provider.id || !service?.accepts_custom_quotes) {
    return { ok: false, error: 'Quote request not found.' }
  }
  if (!['requested', 'quoted'].includes(request.status)) {
    return { ok: false, error: 'This quote request is no longer open.' }
  }

  await admin
    .from('quotes')
    .update({ status: 'superseded' })
    .eq('quote_request_id', quoteRequestId)
    .eq('provider_id', provider.id)
    .eq('status', 'sent')

  const { data: quote, error } = await admin
    .from('quotes')
    .insert({
      quote_request_id: quoteRequestId,
      provider_id: provider.id,
      line_items: lineItems.lineItems,
      total_amount: lineItems.totalAmount,
      validity_date: validityDate,
      // TODO(aya): legal review before making quote terms mandatory/defaulted.
      terms_text: termsText,
      status: 'sent',
    })
    .select('id')
    .single()

  if (error || !quote) {
    console.error('Quote insert failed:', error?.message)
    return { ok: false, error: 'Could not send this quote.' }
  }

  await admin
    .from('quote_requests')
    .update({ status: 'quoted', decline_reason: null })
    .eq('id', quoteRequestId)

  void sendCustomQuoteReadyEmail(quoteRequestId)

  revalidatePath('/provider-dashboard/quotes')
  revalidatePath(`/provider-dashboard/quotes/${quoteRequestId}`)
  revalidatePath('/customer-account')

  return { ok: true, quoteId: quote.id }
}

export type DeclineQuoteRequestResult =
  | { ok: true }
  | { ok: false; error: string }

export async function declineQuoteRequest(
  formData: FormData,
): Promise<DeclineQuoteRequestResult> {
  const { provider } = await requireProviderSession()
  const quoteRequestId = (formData.get('quoteRequestId') as string | null)?.trim()
  const reason = ((formData.get('declineReason') as string | null) ?? '').trim()

  if (!quoteRequestId) return { ok: false, error: 'Quote request not found.' }
  if (!reason) return { ok: false, error: 'Add a short reason.' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('quote_requests')
    .select('id, status')
    .eq('id', quoteRequestId)
    .eq('provider_id', provider.id)
    .maybeSingle()

  if (!request) return { ok: false, error: 'Quote request not found.' }
  if (!['requested', 'quoted'].includes(request.status)) {
    return { ok: false, error: 'This quote request is no longer open.' }
  }

  await admin
    .from('quotes')
    .update({ status: 'superseded' })
    .eq('quote_request_id', quoteRequestId)
    .eq('provider_id', provider.id)
    .eq('status', 'sent')

  await admin
    .from('quote_requests')
    .update({ status: 'declined', decline_reason: reason.slice(0, 500) })
    .eq('id', quoteRequestId)

  revalidatePath('/provider-dashboard/quotes')
  revalidatePath(`/provider-dashboard/quotes/${quoteRequestId}`)
  revalidatePath('/customer-account')

  return { ok: true }
}

function isPastValidityDate(validityDate: string, now = new Date()): boolean {
  const today = now.toISOString().slice(0, 10)
  return validityDate < today
}

export async function acceptCustomQuote(formData: FormData): Promise<void> {
  const { customer } = await requireCustomerSession()
  const quoteId = (formData.get('quoteId') as string | null)?.trim()
  if (!quoteId) redirect('/customer-account/quotes')

  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes')
    .select(`
      id,
      quote_request_id,
      provider_id,
      total_amount,
      validity_date,
      status,
      request:quote_requests!quotes_quote_request_id_fkey(
        id,
        customer_id,
        provider_id,
        service_id,
        status,
        service:services!quote_requests_service_id_fkey(id, title)
      )
    `)
    .eq('id', quoteId)
    .maybeSingle()

  const request = Array.isArray(quote?.request) ? quote?.request[0] : quote?.request
  const service = Array.isArray(request?.service) ? request?.service[0] : request?.service

  if (!quote || !request || request.customer_id !== customer.id || quote.status !== 'sent') {
    redirect('/customer-account/quotes')
  }

  if (isPastValidityDate(quote.validity_date)) {
    await admin.from('quotes').update({ status: 'expired' }).eq('id', quote.id)
    await admin
      .from('quote_requests')
      .update({ status: 'expired' })
      .eq('id', request.id)
      .eq('status', 'quoted')
    redirect('/customer-account/quotes?expired=1')
  }

  const { data: customerRow } = await admin
    .from('customers')
    .select('credit_balance')
    .eq('id', customer.id)
    .single()

  const commission = await calculateQuoteBookingCommission(
    admin,
    quote.provider_id,
    Number(quote.total_amount),
  )

  const booking = await createBookingWithCredits({
    customerId: customer.id,
    customerCreditBalance: Number(customerRow?.credit_balance ?? 0),
    providerId: quote.provider_id,
    serviceId: request.service_id,
    packageId: null,
    notes: `Custom quote ${quote.id}`,
    commission,
    description: `Custom quote booking: ${service?.title ?? 'Service'}`,
  })

  if (!booking.ok) {
    if (booking.reason === 'insufficient_credits') {
      redirect(`/customer-account/credits?amount=${booking.shortfall}`)
    }
    redirect('/customer-account/quotes?error=booking')
  }

  await admin
    .from('quotes')
    .update({ status: 'accepted', booking_id: booking.bookingId })
    .eq('id', quote.id)

  await admin
    .from('quote_requests')
    .update({ status: 'accepted' })
    .eq('id', request.id)

  await admin
    .from('bookings')
    .update({ quote_request_id: request.id, quote_id: quote.id })
    .eq('id', booking.bookingId)

  revalidatePath('/customer-account/quotes')
  revalidatePath('/customer-account/bookings')
  revalidatePath('/provider-dashboard/quotes')

  redirect(`/customer-account/bookings/${booking.bookingId}`)
}

export type DeclineIssuedQuoteResult =
  | { ok: true }
  | { ok: false; error: string }

export async function declineIssuedQuote(
  formData: FormData,
): Promise<DeclineIssuedQuoteResult> {
  const { customer } = await requireCustomerSession()
  const quoteId = (formData.get('quoteId') as string | null)?.trim()
  const reason = ((formData.get('declineReason') as string | null) ?? '').trim()

  if (!quoteId) return { ok: false, error: 'Quote not found.' }
  if (!reason) return { ok: false, error: 'Add a short reason.' }

  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes')
    .select(`
      id,
      quote_request_id,
      status,
      request:quote_requests!quotes_quote_request_id_fkey(id, customer_id, status)
    `)
    .eq('id', quoteId)
    .maybeSingle()

  const request = Array.isArray(quote?.request) ? quote?.request[0] : quote?.request
  if (!quote || !request || request.customer_id !== customer.id || quote.status !== 'sent') {
    return { ok: false, error: 'Quote not found.' }
  }

  await admin
    .from('quotes')
    .update({ status: 'declined', decline_reason: reason.slice(0, 500) })
    .eq('id', quote.id)

  await admin
    .from('quote_requests')
    .update({ status: 'requested', decline_reason: null })
    .eq('id', request.id)

  revalidatePath('/customer-account/quotes')
  revalidatePath('/provider-dashboard/quotes')

  return { ok: true }
}
