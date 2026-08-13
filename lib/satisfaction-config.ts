/**
 * Typed accessors for config/satisfaction.json.
 *
 * Follows the same pattern as lib/nurture-emails-config.ts / lib/booking-lifecycle-config.ts.
 * Documented in config/README.md.
 */

import satisfaction from '@/config/satisfaction.json'

export { satisfaction }

export const NPS_BATCH_SIZE = satisfaction.batchSize
export const NPS_MAX_ATTEMPTS = satisfaction.maxAttempts

/** Hours after booking completion before the customer NPS email sends. TODO(aya): confirm — suggested 24. */
export const CUSTOMER_NPS_DELAY_HOURS = satisfaction.customer.delayHours

/** Days after claim/signup before a provider's first NPS survey. TODO(aya): confirm — suggested 30. */
export const PROVIDER_NPS_FIRST_SURVEY_DAYS = satisfaction.provider.firstSurveyDays

/** Days between repeat provider NPS surveys after the first. TODO(aya): confirm — suggested 90. */
export const PROVIDER_NPS_QUARTERLY_INTERVAL_DAYS = satisfaction.provider.quarterlyIntervalDays

export const CUSTOMER_NPS_COPY = satisfaction.customer
export const PROVIDER_NPS_COPY = satisfaction.provider
