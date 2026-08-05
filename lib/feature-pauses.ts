import featurePauses from '@/config/feature-pauses.json'

export type FeaturePauseKey = 'purchases' | 'profileClaiming' | 'signUp' | 'login'

interface FeaturePauseEntry {
  paused: boolean
  message: string
}

const PAUSES = featurePauses as Record<FeaturePauseKey, FeaturePauseEntry>

export function isFeaturePaused(key: FeaturePauseKey): boolean {
  return PAUSES[key]?.paused ?? false
}

export function getFeaturePauseMessage(key: FeaturePauseKey): string {
  return PAUSES[key]?.message ?? 'This action is temporarily unavailable. Please check back soon.'
}
