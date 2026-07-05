import { Resend } from 'resend'

const FROM_EMAIL = 'ayabonga@servicepros.co.za'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) {
    console.warn('RESEND_API_KEY not set — email not sent:', params.subject, '→', params.to)
    return { ok: false, error: 'Email not configured' }
  }

  const { error } = await resend.emails.send({
    from: `ServicePros <${FROM_EMAIL}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })

  if (error) {
    console.error('Resend error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function sendClaimVerificationEmail({
  to,
  code,
  businessName,
  verifyUrl,
}: {
  to: string
  code: string
  businessName: string
  verifyUrl: string
}) {
  return sendEmail({
    to,
    subject: 'Verify your ServicePros business claim',
    html: `
      <p>You requested to claim <strong>${businessName}</strong> on ServicePros.</p>
      <p>Your verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>Enter this code on the verification page, or <a href="${verifyUrl}">click here to verify</a>.</p>
      <p>This code expires in 24 hours.</p>
    `,
  })
}

export async function sendSubscriptionExpiryEmail({
  to,
  businessName,
  billingUrl,
}: {
  to: string
  businessName: string
  billingUrl: string
}) {
  return sendEmail({
    to,
    subject: 'Your ServicePros subscription has expired',
    html: `
      <p>Hi,</p>
      <p>Your subscription for <strong>${businessName}</strong> has expired. Your profile is no longer visible to customers.</p>
      <p><a href="${billingUrl}">Renew your subscription</a> to restore your listing and continue receiving bookings.</p>
    `,
  })
}

export async function sendSubscriptionRenewalReminderEmail({
  to,
  businessName,
  daysRemaining,
  billingUrl,
}: {
  to: string
  businessName: string
  daysRemaining: number
  billingUrl: string
}) {
  return sendEmail({
    to,
    subject: `Your ServicePros subscription renews in ${daysRemaining} days`,
    html: `
      <p>Hi,</p>
      <p>Your subscription for <strong>${businessName}</strong> renews in <strong>${daysRemaining} days</strong>.</p>
      <p><a href="${billingUrl}">View billing details</a> or renew early from your dashboard.</p>
    `,
  })
}
