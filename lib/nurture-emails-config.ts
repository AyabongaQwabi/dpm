import nurtureEmailConfig from '@/config/nurture-emails.json'

export type NurtureAudience = 'provider' | 'customer'

export interface NurtureEmailStep {
  stepKey: string
  offsetDays: number
  subject: string
  heading: string
  body: string
  bullets: string[]
  ctaLabel: string
  ctaPath: string
}

export interface NurtureSequenceConfig {
  sequenceKey: string
  steps: NurtureEmailStep[]
}

export const NURTURE_EMAIL_BATCH_SIZE = nurtureEmailConfig.batchSize
export const NURTURE_EMAIL_MAX_ATTEMPTS = nurtureEmailConfig.maxAttempts

export function getNurtureSequence(audience: NurtureAudience): NurtureSequenceConfig {
  return nurtureEmailConfig[audience]
}

export function getNurtureStep(audience: NurtureAudience, stepKey: string): NurtureEmailStep | null {
  return getNurtureSequence(audience).steps.find((step) => step.stepKey === stepKey) ?? null
}
