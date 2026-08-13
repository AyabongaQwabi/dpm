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
  text?: string
  replyTo?: string
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
    // Every booking-lifecycle email supplies a plain-text alternative. Older
    // templates predate this and omit it; Resend handles the absence.
    text: params.text ?? stripHtml(params.html),
    replyTo: params.replyTo,
  })

  if (error) {
    console.error('Resend error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function sendNurtureEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  return sendEmail({ to, subject, html })
}

export async function sendAnalyticsDigestEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  return sendEmail({ to, subject, html })
}

export async function sendFeatureRequestNotificationEmail({
  to,
  replyTo,
  title,
  html,
}: {
  to: string
  replyTo: string
  title: string
  html: string
}) {
  return sendEmail({
    to,
    replyTo,
    subject: `New feature request — ${title}`,
    html,
  })
}

export async function sendFeatureRequestConfirmationEmail({
  to,
  title,
  html,
}: {
  to: string
  title: string
  html: string
}) {
  return sendEmail({
    to,
    subject: `We received your ServicePros feature request — ${title}`,
    html,
  })
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

export async function sendContactVerificationEmail({
  to,
  code,
  businessName,
}: {
  to: string
  code: string
  businessName: string
}) {
  return sendEmail({
    to,
    subject: 'Confirm your ServicePros contact email',
    html: `
      <p>Confirm the contact email for <strong>${businessName}</strong> on ServicePros.</p>
      <p>Your verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>Enter this code on your dashboard's verification page. This code expires in 24 hours.</p>
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

// ============================================================================
// Booking lifecycle emails (Part 6)
//
// Same inline-template-literal pattern as everything above. Each one gets a
// single clear primary button and a plain-text alternative (derived by
// stripHtml unless a better one is passed).
//
// All sending is fire-and-forget relative to the transaction: callers use
// `void send...()` so a Resend failure can never roll back a booking or a
// credit debit. Failures are logged by sendEmail.
// ============================================================================

/** Crude but adequate HTML → text for the plain-text alternative. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

/** Escape user-supplied values before they enter a template literal. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** The single primary button used across every lifecycle email. */
function button(href: string, label: string): string {
  return `<p style="margin:24px 0">
      <a href="${href}" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">${esc(label)}</a>
    </p>`
}

function requirementList(items: string[]): string {
  if (items.length === 0) return ''
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
}

export async function sendBookingConfirmedCustomerEmail({
  to,
  serviceTitle,
  providerName,
  creditsSpent,
  requirements,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  creditsSpent: number
  requirements: string[]
  bookingUrl: string
}) {
  const reqBlock = requirements.length
    ? `<p>To get started, <strong>${providerName === '' ? 'your provider' : esc(providerName)}</strong> needs the following from you:</p>
       ${requirementList(requirements)}`
    : ''

  return sendEmail({
    to,
    subject: `Booking confirmed — ${serviceTitle}`,
    html: `
      <p>Your booking is confirmed.</p>
      <p><strong>${esc(serviceTitle)}</strong> from <strong>${esc(providerName)}</strong>.</p>
      <p>${creditsSpent} credits have been deducted from your wallet.</p>
      ${reqBlock}
      ${button(bookingUrl, requirements.length ? 'Upload your requirements' : 'View your booking')}
      <p>TODO(aya): legal review — cancellation and refund terms summary belongs here.</p>
    `,
  })
}

export async function sendCustomQuoteReadyCustomerEmail({
  to,
  serviceTitle,
  providerName,
  quoteUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  quoteUrl: string
}) {
  return sendEmail({
    to,
    subject: `${providerName} sent your custom quote`,
    html: `
      <p><strong>${esc(providerName)}</strong> has sent a custom quote for <strong>${esc(serviceTitle)}</strong>.</p>
      <p>You can review and respond to it in your ServicePros account.</p>
      ${button(quoteUrl, 'Review your quote')}
      <p>TODO(aya): legal review — quote validity and acceptance terms summary belongs here.</p>
    `,
  })
}

export async function sendNewBookingProviderEmail({
  to,
  serviceTitle,
  customerFirstName,
  amount,
  requirementCount,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  customerFirstName: string
  amount: number
  requirementCount: number
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `New booking — ${serviceTitle}`,
    html: `
      <p>You have a new booking.</p>
      <p><strong>${esc(serviceTitle)}</strong> for <strong>${esc(customerFirstName)}</strong>.</p>
      <p>Value: R${amount}</p>
      <p>${requirementCount > 0 ? `${requirementCount} requirement${requirementCount === 1 ? '' : 's'} will be collected from the customer.` : 'No requirements are attached to this service.'}</p>
      ${button(bookingUrl, 'View the booking')}
    `,
  })
}

export async function sendBookingAcceptedCustomerEmail({
  to,
  serviceTitle,
  providerName,
  outstandingRequirements,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  outstandingRequirements: string[]
  bookingUrl: string
}) {
  const reqBlock = outstandingRequirements.length
    ? `<p>Still outstanding from you:</p>${requirementList(outstandingRequirements)}`
    : ''

  return sendEmail({
    to,
    subject: `${providerName} accepted your booking`,
    html: `
      <p><strong>${esc(providerName)}</strong> has accepted your booking for <strong>${esc(serviceTitle)}</strong>.</p>
      ${reqBlock}
      ${button(bookingUrl, outstandingRequirements.length ? 'Upload your requirements' : 'View your booking')}
    `,
  })
}

export async function sendBookingDeclinedCustomerEmail({
  to,
  serviceTitle,
  providerName,
  reason,
  creditsRefunded,
  browseUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  reason: string | null
  creditsRefunded: number
  browseUrl: string
}) {
  return sendEmail({
    to,
    subject: `Your booking for ${serviceTitle} was declined`,
    html: `
      <p><strong>${esc(providerName)}</strong> was unable to take on your booking for <strong>${esc(serviceTitle)}</strong>.</p>
      ${reason ? `<p>Reason given: ${esc(reason)}</p>` : ''}
      <p><strong>${creditsRefunded} credits have been returned to your wallet</strong> and are ready to use on another provider.</p>
      ${button(browseUrl, 'Browse alternatives')}
      <p>TODO(aya): legal review — refund terms wording belongs here.</p>
    `,
  })
}

export async function sendRequirementsReminderCustomerEmail({
  to,
  serviceTitle,
  providerName,
  outstandingRequirements,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  outstandingRequirements: string[]
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `${providerName} is waiting on a few things`,
    html: `
      <p><strong>${esc(providerName)}</strong> needs the following before work can start on <strong>${esc(serviceTitle)}</strong>:</p>
      ${requirementList(outstandingRequirements)}
      ${button(bookingUrl, 'Upload your requirements')}
    `,
  })
}

export async function sendAllRequirementsReceivedProviderEmail({
  to,
  serviceTitle,
  customerFirstName,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  customerFirstName: string
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `All requirements received — ${serviceTitle}`,
    html: `
      <p><strong>${esc(customerFirstName)}</strong> has uploaded everything you asked for on <strong>${esc(serviceTitle)}</strong>.</p>
      <p>You can download the files and get started.</p>
      ${button(bookingUrl, 'View the booking')}
    `,
  })
}

export async function sendWorkCompleteCustomerEmail({
  to,
  serviceTitle,
  providerName,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `${providerName} marked your booking complete`,
    html: `
      <p><strong>${esc(providerName)}</strong> has marked the work on <strong>${esc(serviceTitle)}</strong> as complete.</p>
      <p>Please confirm you are happy with the work. Once you confirm, your review helps other customers choose well.</p>
      ${button(bookingUrl, 'Confirm and review')}
    `,
  })
}

export async function sendBookingCompletedCustomerEmail({
  to,
  serviceTitle,
  providerName,
  creditsSpent,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  providerName: string
  creditsSpent: number
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `Booking completed — ${serviceTitle}`,
    html: `
      <p>Your booking for <strong>${esc(serviceTitle)}</strong> with <strong>${esc(providerName)}</strong> is complete.</p>
      <p>Total paid: ${creditsSpent} credits.</p>
      <p>How did it go? Leaving a review takes a minute and helps the next customer.</p>
      ${button(bookingUrl, 'Leave a review')}
    `,
  })
}

export async function sendBookingCompletedProviderEmail({
  to,
  serviceTitle,
  netPayoutAmount,
  bookingUrl,
}: {
  to: string
  serviceTitle: string
  netPayoutAmount: number
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `Completed — ${serviceTitle}`,
    html: `
      <p>The customer has confirmed completion of <strong>${esc(serviceTitle)}</strong>.</p>
      <p><strong>Payout of R${netPayoutAmount} is being processed.</strong></p>
      ${button(bookingUrl, 'View the booking')}
    `,
  })
}

export async function sendNewBookingMessageEmail({
  to,
  senderName,
  serviceTitle,
  preview,
  bookingUrl,
}: {
  to: string
  senderName: string
  serviceTitle: string
  preview: string
  bookingUrl: string
}) {
  return sendEmail({
    to,
    subject: `New message from ${senderName}`,
    html: `
      <p><strong>${esc(senderName)}</strong> sent you a message about <strong>${esc(serviceTitle)}</strong>:</p>
      <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:4px 0 4px 12px;color:#4b5563">${esc(preview)}</blockquote>
      ${button(bookingUrl, 'Reply')}
    `,
  })
}
