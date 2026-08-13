/**
 * Typed accessors for config/booking-lifecycle.json.
 *
 * Follows the same pattern as lib/platform-config.ts: a static JSON import
 * behind named accessors, so no booking/file/review/messaging code carries a
 * hardcoded commercial value. Every `*Confirmed: false` flag marks a value
 * the product owner has not signed off yet (`TODO(aya): confirm`), and the
 * accompanying number is a clearly-marked suggested default only.
 *
 * Documented in config/README.md.
 */

import bookingLifecycle from '@/config/booking-lifecycle.json'

export { bookingLifecycle }

const MB = 1024 * 1024

/**
 * Days after `completed_by_provider` before a booking auto-completes.
 * TODO(aya): confirm — suggested 7.
 */
export const AUTO_COMPLETE_DAYS = bookingLifecycle.autoComplete.daysAfterProviderComplete

/**
 * Whether the auto-completion sweep is allowed to act. Ships false: the cron
 * job stub runs and reports what it *would* do, but transitions nothing until
 * the window above is confirmed.
 */
export const AUTO_COMPLETE_ENABLED = bookingLifecycle.autoComplete.enabled

/** Confirmed at 20 MB per file by the product owner. */
export const MAX_BOOKING_FILE_SIZE_MB = bookingLifecycle.files.maxFileSizeMb
export const MAX_BOOKING_FILE_SIZE_BYTES = MAX_BOOKING_FILE_SIZE_MB * MB

/**
 * Generous per-booking ceiling so a runaway upload loop is bounded without
 * blocking real use. TODO(aya): confirm — suggested 500 MB.
 */
export const MAX_BOOKING_TOTAL_MB = bookingLifecycle.files.maxTotalPerBookingMb
export const MAX_BOOKING_TOTAL_BYTES = MAX_BOOKING_TOTAL_MB * MB

/** Days after `completed` before the booking thread goes read-only. TODO(aya): confirm — suggested 30. */
export const MESSAGING_CLOSE_AFTER_COMPLETED_DAYS =
  bookingLifecycle.messaging.closeAfterCompletedDays

/**
 * Poll interval for the booking thread. The project has no Supabase realtime
 * subscriptions anywhere today, so booking messages poll rather than add a
 * new realtime dependency. Tradeoff noted in the build report.
 */
export const MESSAGE_POLL_INTERVAL_MS = bookingLifecycle.messaging.pollIntervalMs

/** Minimum gap between provider "nudge customer" emails on one booking. TODO(aya): confirm — suggested 24h. */
export const NUDGE_RATE_LIMIT_HOURS = bookingLifecycle.notifications.nudgeRateLimitHours

/** Suppression window for new-message emails on one booking. TODO(aya): confirm — suggested 15min. */
export const NEW_MESSAGE_BATCH_WINDOW_MINUTES =
  bookingLifecycle.notifications.newMessageBatchWindowMinutes

/** How long a customer may edit their review before it locks. TODO(aya): confirm — suggested 14 days. */
export const REVIEW_EDITABLE_FOR_DAYS = bookingLifecycle.reviews.editableForDays

/** How long a provider may edit their public reply. TODO(aya): confirm — suggested 24h. */
export const PROVIDER_REPLY_EDITABLE_FOR_HOURS =
  bookingLifecycle.reviews.providerReplyEditableForHours

/** Minimum published reviews before a rating shows on search/listing cards. TODO(aya): confirm — suggested 1. */
export const MIN_REVIEWS_TO_DISPLAY_RATING =
  bookingLifecycle.reviews.minReviewsToDisplayRating

/** Private storage bucket for the customer↔provider file exchange. */
export const BOOKING_FILES_BUCKET = 'booking-files'

/** Lifetime of a download signed URL, in seconds. Code constant, not a commercial value. */
export const SIGNED_URL_TTL_SECONDS = 60
