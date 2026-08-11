import featureRequestConfig from '../config/feature-requests.json'

export type FeatureRequestRole = 'customer' | 'provider' | 'agent' | 'other'
export type FeatureRequestArea = 'search' | 'profile' | 'payments' | 'messaging' | 'reviews' | 'mobile' | 'other'
export type FeatureRequestStatus = 'new' | 'triaged' | 'planned' | 'in_progress' | 'shipped' | 'declined'

export const FEATURE_REQUEST_LIMITS = featureRequestConfig.limits
export const FEATURE_REQUEST_RATE_LIMIT = featureRequestConfig.rateLimit
export const FEATURE_REQUEST_NOTIFICATION = featureRequestConfig.notification

export const FEATURE_REQUEST_ROLE_OPTIONS = featureRequestConfig.submitterRoles as Array<{
  value: FeatureRequestRole
  label: string
}>

export const FEATURE_REQUEST_AREA_OPTIONS = featureRequestConfig.areas as Array<{
  value: FeatureRequestArea
  label: string
}>

export const FEATURE_REQUEST_ROLE_VALUES = FEATURE_REQUEST_ROLE_OPTIONS.map((option) => option.value)
export const FEATURE_REQUEST_AREA_VALUES = FEATURE_REQUEST_AREA_OPTIONS.map((option) => option.value)
