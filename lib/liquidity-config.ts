/**
 * Typed accessors for config/liquidity.json.
 *
 * Follows the same pattern as lib/booking-lifecycle-config.ts: a static JSON
 * import behind named accessors, so the liquid-cell dashboard and leakage
 * queries carry no hardcoded threshold. Every `*Confirmed: false` flag marks
 * a value the product owner has not signed off yet (`TODO(aya): confirm`),
 * and the accompanying number is a clearly-marked suggested default only.
 *
 * Documented in config/README.md.
 */

import liquidity from '@/config/liquidity.json'

export { liquidity }

/** Minimum claimed, bookable providers for a category x city cell to count as liquid. TODO(aya): confirm — suggested 8. */
export const MIN_PROVIDERS_PER_CELL = liquidity.liquidCell.minProvidersPerCell

/** Minimum share of bookings with a provider first response within 24h. TODO(aya): confirm — suggested 0.80. */
export const MIN_RESPONSE_RATE_24H = liquidity.liquidCell.minResponseRate24h

/** Minimum completed bookings in the trailing 30 days for a cell to count as liquid. TODO(aya): confirm — suggested 1. */
export const MIN_COMPLETED_BOOKINGS_30D = liquidity.liquidCell.minCompletedBookings30d

/** Days after service_viewed before it counts as "viewed, never booked" leakage. TODO(aya): confirm — suggested 30. */
export const LEAKAGE_WINDOW_DAYS = liquidity.leakage.windowDays

/** Max rows in one manual leakage-sample CSV export. TODO(aya): confirm — suggested 50. */
export const LEAKAGE_CSV_SAMPLE_SIZE = liquidity.leakage.csvSampleSize
