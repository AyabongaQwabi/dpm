import { createHash } from 'node:crypto'
import {
  FEATURE_REQUEST_AREA_OPTIONS,
  FEATURE_REQUEST_AREA_VALUES,
  FEATURE_REQUEST_LIMITS,
  FEATURE_REQUEST_RATE_LIMIT,
  FEATURE_REQUEST_ROLE_OPTIONS,
  FEATURE_REQUEST_ROLE_VALUES,
  type FeatureRequestArea,
  type FeatureRequestRole,
} from '../feature-requests-config'

export interface FeatureRequestInput {
  name: string
  email: string
  submitterRole: FeatureRequestRole
  area: FeatureRequestArea
  title: string
  description: string
  sourcePath: string | null
  honeypot: string
}

export interface FeatureRequestInsert {
  user_id: string | null
  name: string
  email: string
  submitter_role: FeatureRequestRole
  area: FeatureRequestArea
  title: string
  description: string
  source_path: string | null
  user_agent: string | null
  ip_hash: string | null
}

export interface StoredFeatureRequest extends FeatureRequestInsert {
  id: string
  created_at?: string
}

export interface FeatureRequestActionState {
  ok: boolean
  message: string
  errors: Partial<Record<keyof FeatureRequestInput, string>>
}

export const initialFeatureRequestState: FeatureRequestActionState = {
  ok: false,
  message: '',
  errors: {},
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export function parseFeatureRequestForm(formData: FormData): FeatureRequestInput {
  return {
    name: formString(formData, 'name'),
    email: formString(formData, 'email').toLowerCase(),
    submitterRole: formString(formData, 'submitterRole') as FeatureRequestRole,
    area: formString(formData, 'area') as FeatureRequestArea,
    title: formString(formData, 'title'),
    description: formString(formData, 'description'),
    sourcePath: formString(formData, 'sourcePath') || null,
    honeypot: formString(formData, 'companyWebsite'),
  }
}

export function validateFeatureRequestInput(input: FeatureRequestInput): FeatureRequestActionState['errors'] {
  const errors: FeatureRequestActionState['errors'] = {}

  if (!input.name) errors.name = 'Tell us your name.'
  if (input.name.length > FEATURE_REQUEST_LIMITS.nameMaxChars) {
    errors.name = `Name must be ${FEATURE_REQUEST_LIMITS.nameMaxChars} characters or less.`
  }

  if (!input.email || !EMAIL_PATTERN.test(input.email)) errors.email = 'Enter a valid email address.'
  if (input.email.length > FEATURE_REQUEST_LIMITS.emailMaxChars) {
    errors.email = `Email must be ${FEATURE_REQUEST_LIMITS.emailMaxChars} characters or less.`
  }

  if (!FEATURE_REQUEST_ROLE_VALUES.includes(input.submitterRole)) {
    errors.submitterRole = 'Choose the option that best describes you.'
  }

  if (!FEATURE_REQUEST_AREA_VALUES.includes(input.area)) {
    errors.area = 'Choose which part of ServicePros this relates to.'
  }

  if (!input.title) errors.title = 'Add a short title.'
  if (input.title.length > FEATURE_REQUEST_LIMITS.titleMaxChars) {
    errors.title = `Title must be ${FEATURE_REQUEST_LIMITS.titleMaxChars} characters or less.`
  }

  if (!input.description) errors.description = 'Tell us what you want to improve.'
  if (input.description.length > FEATURE_REQUEST_LIMITS.descriptionMaxChars) {
    errors.description = `Description must be ${FEATURE_REQUEST_LIMITS.descriptionMaxChars} characters or less.`
  }

  return errors
}

export function hashIpAddress(ip: string | null, salt: string): string | null {
  if (!ip) return null
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export function rateLimitSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - FEATURE_REQUEST_RATE_LIMIT.windowMinutes * 60 * 1000)
}

export function labelForRole(value: FeatureRequestRole): string {
  return FEATURE_REQUEST_ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function labelForArea(value: FeatureRequestArea): string {
  return FEATURE_REQUEST_AREA_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function isRateLimited(recentSubmissionCount: number): boolean {
  return recentSubmissionCount >= FEATURE_REQUEST_RATE_LIMIT.maxSubmissionsPerHour
}
