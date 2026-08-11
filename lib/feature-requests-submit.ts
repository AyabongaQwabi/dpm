import { FEATURE_REQUEST_NOTIFICATION } from './feature-requests-config'
import {
  initialFeatureRequestState,
  isRateLimited,
  labelForArea,
  labelForRole,
  parseFeatureRequestForm,
  rateLimitSince,
  validateFeatureRequestInput,
  type FeatureRequestActionState,
  type FeatureRequestInsert,
  type StoredFeatureRequest,
} from './domain/feature-requests'

export interface SubmitFeatureRequestContext {
  userId: string | null
  userAgent: string | null
  ipHash: string | null
  now?: Date
}

export interface SubmitFeatureRequestDeps {
  countRecentSubmissions: (params: { ipHash: string; sinceIso: string }) => Promise<number>
  insertFeatureRequest: (row: FeatureRequestInsert) => Promise<StoredFeatureRequest>
  sendNotificationEmail: (params: { request: StoredFeatureRequest; html: string }) => Promise<void>
  sendConfirmationEmail: (params: { request: StoredFeatureRequest; html: string }) => Promise<void>
  logEmailError?: (error: unknown) => void
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function notificationHtml(request: StoredFeatureRequest): string {
  return `
    <p>A new feature request was submitted on ServicePros.</p>
    <dl>
      <dt>Row ID</dt><dd>${escapeHtml(request.id)}</dd>
      <dt>User ID</dt><dd>${escapeHtml(request.user_id ?? 'Anonymous')}</dd>
      <dt>Name</dt><dd>${escapeHtml(request.name)}</dd>
      <dt>Email</dt><dd>${escapeHtml(request.email)}</dd>
      <dt>Role</dt><dd>${escapeHtml(labelForRole(request.submitter_role))}</dd>
      <dt>Area</dt><dd>${escapeHtml(labelForArea(request.area))}</dd>
      <dt>Title</dt><dd>${escapeHtml(request.title)}</dd>
      <dt>Description</dt><dd>${escapeHtml(request.description).replaceAll('\n', '<br>')}</dd>
      <dt>Source path</dt><dd>${escapeHtml(request.source_path ?? 'Not captured')}</dd>
    </dl>
  `
}

function confirmationHtml(request: StoredFeatureRequest): string {
  return `
    <p>Hi ${escapeHtml(request.name)},</p>
    <p>Thanks for sending an idea to ServicePros. A real person will read it. We may reply if we need more detail.</p>
    <p><strong>${escapeHtml(request.title)}</strong></p>
    <p>${escapeHtml(request.description).replaceAll('\n', '<br>')}</p>
    <p>Not every request gets built, but every useful request helps us understand what to improve.</p>
  `
}

export async function submitFeatureRequestWithDeps(
  prevState: FeatureRequestActionState = initialFeatureRequestState,
  formData: FormData,
  context: SubmitFeatureRequestContext,
  deps: SubmitFeatureRequestDeps,
): Promise<FeatureRequestActionState> {
  void prevState
  const input = parseFeatureRequestForm(formData)

  if (input.honeypot) {
    return {
      ok: true,
      message: 'Thanks — your request has been received.',
      errors: {},
    }
  }

  const errors = validateFeatureRequestInput(input)
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Please fix the highlighted fields.',
      errors,
    }
  }

  if (context.ipHash) {
    const sinceIso = rateLimitSince(context.now ?? new Date()).toISOString()
    const recentCount = await deps.countRecentSubmissions({ ipHash: context.ipHash, sinceIso })
    if (isRateLimited(recentCount)) {
      return {
        ok: false,
        message: 'We have received a few requests from this connection recently. Please try again later.',
        errors: {},
      }
    }
  }

  const row: FeatureRequestInsert = {
    user_id: context.userId,
    name: input.name,
    email: input.email,
    submitter_role: input.submitterRole,
    area: input.area,
    title: input.title,
    description: input.description,
    source_path: input.sourcePath,
    user_agent: context.userAgent,
    ip_hash: context.ipHash,
  }

  const request = await deps.insertFeatureRequest(row)
  const notification = notificationHtml(request)
  const confirmation = confirmationHtml(request)

  await Promise.allSettled([
    deps.sendNotificationEmail({ request, html: notification }),
    deps.sendConfirmationEmail({ request, html: confirmation }),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        deps.logEmailError?.(result.reason)
      }
    }
  })

  return {
    ok: true,
    message: `Thanks — your request has been received. We sent a copy to ${request.email}.`,
    errors: {},
  }
}

export { FEATURE_REQUEST_NOTIFICATION }
