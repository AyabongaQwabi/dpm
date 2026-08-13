import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/seo'
import { sendCustomQuoteReadyCustomerEmail } from '@/lib/email/resend'

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function customerQuoteUrl(quoteRequestId: string) {
  return `${SITE_URL}/customer-account/quotes#${quoteRequestId}`
}

export async function sendCustomQuoteReadyEmail(quoteRequestId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: request } = await admin
      .from('quote_requests')
      .select(`
        id,
        customer:customers!quote_requests_customer_id_fkey(email),
        provider:providers!quote_requests_provider_id_fkey(business_name),
        service:services!quote_requests_service_id_fkey(title)
      `)
      .eq('id', quoteRequestId)
      .single()

    if (!request) return

    const customer = first(request.customer as { email: string } | { email: string }[] | null)
    const provider = first(request.provider as { business_name: string } | { business_name: string }[] | null)
    const service = first(request.service as { title: string } | { title: string }[] | null)

    if (!customer?.email) return

    await sendCustomQuoteReadyCustomerEmail({
      to: customer.email,
      providerName: provider?.business_name ?? 'Your provider',
      serviceTitle: service?.title ?? 'your service',
      quoteUrl: customerQuoteUrl(quoteRequestId),
    })
  } catch (err) {
    console.error('Custom quote ready email failed:', err)
  }
}
