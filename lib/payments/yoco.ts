// Yoco Checkout API client — https://developer.yoco.com/api-reference/checkout-api
//
// Yoco has no "get checkout by id" endpoint (unlike Paystack's transaction/verify),
// and does not append any query params to successUrl/cancelUrl/failureUrl on
// redirect. So callers generate their own reference (randomPaymentReference),
// thread it through the successUrl themselves AND through metadata — the
// webhook echoes metadata back, and the return page polls the DB for a
// credit_transactions/provider_subscriptions row matching that same
// reference. See app/api/webhooks/yoco/route.ts.

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export function randomPaymentReference(): string {
  return randomUUID()
}

const YOCO_API_BASE = 'https://payments.yoco.com/api'

export type YocoCheckoutMetadata = Record<string, string | number | null>

export interface CreateCheckoutParams {
  /** Amount in the smallest currency unit (cents for ZAR). */
  amountInCents: number
  successUrl: string
  cancelUrl: string
  failureUrl: string
  metadata: YocoCheckoutMetadata
}

export interface CreateCheckoutResult {
  ok: true
  redirectUrl: string
  checkoutId: string
}

export interface CreateCheckoutError {
  ok: false
  error: string
}

export async function createYocoCheckout(
  params: CreateCheckoutParams,
): Promise<CreateCheckoutResult | CreateCheckoutError> {
  const secretKey = process.env.YOCO_SECRET_KEY
  if (!secretKey) {
    return { ok: false, error: 'Payment not configured' }
  }

  const res = await fetch(`${YOCO_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountInCents,
      currency: 'ZAR',
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      failureUrl: params.failureUrl,
      metadata: params.metadata,
    }),
  })

  const data = await res.json() as {
    id?: string
    redirectUrl?: string
    message?: string
  }

  if (!res.ok || !data.redirectUrl || !data.id) {
    return { ok: false, error: data.message ?? 'Failed to initialize payment' }
  }

  return { ok: true, redirectUrl: data.redirectUrl, checkoutId: data.id }
}

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 3 * 60

/**
 * Verifies a Yoco webhook per the documented scheme:
 * https://developer.yoco.com/online/guides/webhooks/verifying-the-events
 *
 * Signed content = `${webhookId}.${webhookTimestamp}.${rawBody}`, HMAC-SHA256
 * with the base64-decoded secret (after stripping the `whsec_` prefix),
 * base64-encoded. The webhook-signature header carries one or more
 * space-separated `v1,<sig>` values — any match is accepted.
 */
export function verifyYocoWebhookSignature(params: {
  rawBody: string
  webhookId: string | null
  webhookTimestamp: string | null
  webhookSignature: string | null
  secret: string
}): boolean {
  const { rawBody, webhookId, webhookTimestamp, webhookSignature, secret } = params
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false

  const timestampSeconds = Number(webhookTimestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  const nowSeconds = Date.now() / 1000
  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) return false

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const expectedSignature = createHmac('sha256', secretBytes).update(signedContent).digest('base64')
  const expectedBuf = Buffer.from(expectedSignature)

  return webhookSignature
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => {
      const sig = part.includes(',') ? part.slice(part.indexOf(',') + 1) : part
      let candidate: Buffer
      try {
        candidate = Buffer.from(sig)
      } catch {
        return false
      }
      if (candidate.length !== expectedBuf.length) return false
      return timingSafeEqual(candidate, expectedBuf)
    })
}

export interface YocoWebhookEvent {
  id: string
  type: string
  createdDate: string
  payload: {
    id: string
    status: string
    amount: number
    currency: string
    metadata: YocoWebhookMetadata
    mode: 'live' | 'test'
  }
}

export type YocoWebhookMetadata = {
  type?: string
  reference?: string
  customer_id?: string
  credit_amount?: number | string
  bonus_credits?: number | string
  promotion_id?: string | null
  provider_id?: string
  subscription_id?: string
  package_number?: number | string
}
