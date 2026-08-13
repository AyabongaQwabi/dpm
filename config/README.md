# Config Files

Configuration in this folder is for business-editable values that should not be repeated across pages, actions, and tests. Import JSON through a small typed module in `lib/` rather than reading these files directly from many places.

When adding a new `config/*.json` file, document it here in the same change: what each setting means, where it is imported, and whether it mirrors database or migration values.

## `contact-details.json`

Named contacts and reason-specific inboxes for `/contact`.

- `siteResponsiblePerson.name` / `.email`: person responsible for the site, disclosed per ECTA s43.
- `routes.generalEnquiry` / `.providerSupport` / `.billing` / `.disputes` / `.media`: reason-specific inboxes shown on the contact routing cards.
- `responseTime`: response time commitment shown on the contact page.
- `popiaInformationOfficer.name` / `.email`: POPIA Information Officer, a distinct statutory role from general contact.

Imported by `lib/contact-details-config.ts`, then used by `app/(public)/contact/page.tsx`.

No database mirror.

## `content-moderation.json`

Provider-authored content moderation word lists for posts and stories.

- `claimWords`: words that flag unverifiable claims such as certification, licensing, accreditation, and guarantees.
- `competitorNames`: competitor names to flag in provider-authored content. Currently empty until Aya confirms names.
- `profanityWords`: baseline profanity list for flagging.

Imported by `lib/content-moderation-config.ts`, then passed into the pure checks in `lib/domain/content-moderation.ts`. Used by `lib/actions/provider-posts.ts` before publishing.

No database mirror. The result is stored per post in `content_posts.moderation_status` and `content_posts.moderation_notes`.

## `credit-promotions.json`

Customer credit-purchase promotion definitions.

- `promotions[].id`: stable promotion identifier stored with wallet transactions.
- `promotions[].name`: display/internal name for the offer.
- `promotions[].description`: customer-facing offer copy.
- `promotions[].type`: promotion calculation mode.
- `promotions[].value`: bonus amount for the configured type.
- `promotions[].applies_to`: eligible purchase group.
- `promotions[].active`: whether the promotion can apply.

Imported by `lib/credit-promotions.ts` and used by customer credit purchase pages/routes.

No migration mirror beyond transaction rows storing the applied promotion id.

## `feature-pauses.json`

Operational kill switches for features that may need to be temporarily disabled.

- Each top-level key is a pauseable feature.
- `paused`: disables the feature when true.
- `message`: user-facing message shown while paused.

Imported by `lib/feature-pauses.ts`, then used by purchase, claim, signup, and login flows.

No database mirror.

## `feature-requests.json`

Public feature-request page configuration for `/feature-requests`.

- `limits.nameMaxChars`, `limits.emailMaxChars`, `limits.titleMaxChars`, `limits.descriptionMaxChars`: form and server validation limits. These are mirrored in `supabase/migrations/20260815000000_feature_requests.sql` as database `CHECK` constraints.
- `rateLimit.maxSubmissionsPerHour`: maximum accepted submissions from the same hashed connection signal inside the rate-limit window.
- `rateLimit.windowMinutes`: rolling window used to count recent submissions.
- `notification.recipient`: internal inbox that receives feature-request notification emails.
- `submitterRoles`: select options for who is submitting the request. Values mirror the `feature_request_submitter_role` Postgres enum.
- `areas`: select options for which part of ServicePros the request concerns. Values mirror the `feature_request_area` Postgres enum.

Imported by `lib/feature-requests-config.ts`, then used by the form, server action, pure validation helpers, and tests.

## `image-upload-guidelines.json`

Recommended dimensions and aspect ratios for provider-uploaded images.

- `profileImage`: square provider logo/avatar guidance for profile headers, cards, dashboards, messages, and bookings.
- `profileCover`: wide Pro profile cover guidance for the public provider profile hero.
- `serviceImage`: service card/detail image guidance.
- `galleryImage`: square profile gallery grid guidance.
- `portfolioImage`: portfolio project card image guidance.
- `postImage`: provider post/feed image guidance.
- `storyImage`: portrait story guidance for story trays and full-screen story viewers.
- `articleImage`: embedded service article image guidance.
- Each entry includes `label`, `recommendedSize`, `aspectRatio`, `usage`, and `guidance`.

Imported by `lib/image-upload-guidelines.ts`, then used by provider dashboard upload controls and composer copy. It does not enforce validation; it gives providers upfront sizing guidance so uploaded images fit their profile and card surfaces predictably.

No database mirror.

## `platform-config.json`

JSON-backed replacement for the old `platform_config` database table.

- `commission.brackets`: commission bracket bounds, labels, and rates.
- `commission.stackingFloor`: minimum effective commission after all discounts/reductions.
- `priceChangeBands`: price-change moderation thresholds and high-demand sales threshold.
- `packages`: provider package numbers, names, fees, commission ceilings, D4D bonuses, temporary reductions, badges, and pricing-page copy.
- `ranking`: provider search ranking weights.
- `serviceRecommendation`: recommended-service ranking weights and minimum review count.
- `booking.autoExpiryHours`: booking request auto-expiry window.
- `creditWallet`: customer credit pack denominations and min/max purchase amounts.
- `providerPayout.businessDays`: payout timing copy/config.
- `providerPayout.minimumRequestAmount`: provider payout request floor in rand.
- `support.email`: support address.
- `referralProgram`: referral agent commission percent and active-month cap.
- `upload.maxFileSizeMb`: provider asset upload size cap.

Imported by `lib/platform-config.ts`, which exposes `loadPlatformConfig()`, `PRICE_CHANGE_BANDS`, `REFERRAL_PROGRAM`, and `MAX_UPLOAD_FILE_SIZE_MB`. Downstream consumers include pricing, payments, ranking, booking expiry, upload, referral copy, and credit flows.

This intentionally supersedes `platform_config` DB reads. If old migrations still seed `platform_config`, treat those rows as legacy until migrations are cleaned up.

## `pro-membership.json`

Pro membership commercial and limit configuration.

- `pricing.monthlyFeeCredits`: standalone monthly Pro cost in provider wallet credits.
- `pricing.annualFeeCredits`: standalone annual Pro cost in provider wallet credits.
- `pricing.currency`: explanatory text for how the credits are charged.
- `packageNumbersIncludingPro`: provider package numbers that include Pro at no extra charge.
- `caps.freeTierGalleryImages`: gallery image cap for non-Pro providers.
- `caps.proGalleryImages`: gallery image cap for Pro providers.
- `caps.freeTierServiceListings`: active service listing cap for non-Pro providers.
- `cancellation.refundWindowHours`: hours after purchase within which a purchased Pro membership can be cancelled for a full credit refund to the provider wallet.
- `cancellation.refundWindowDescription`: user-facing copy explaining the refund window, shown on `/pro`, the billing dashboard cancel control, and `/refund`.

Imported by `lib/entitlements.ts`, then used by Pro purchase, cancellation, package-included Pro, gallery/listing caps, and entitlement tests.

Mirrors the Pro membership migration’s intended commercial values; keep migration comments/seeds aligned if that migration changes.

## `provider-wallet.json`

Provider credit-wallet top-up configuration.

- `topUpPresets`: quick top-up amounts shown on `/provider-dashboard/wallet`.
- `minTopUpCredits`: minimum custom provider wallet top-up.
- `maxTopUpCredits`: maximum single provider wallet top-up.
- `currency`: payment currency used by the Yoco top-up checkout.
- `creditValue`: explanatory copy for the provider wallet exchange rate.

Imported by `lib/provider-wallet-config.ts`, then used by the provider wallet dashboard page and provider wallet top-up API route.

Mirrors the provider wallet migration convention that 1 provider credit equals R1. It does not mirror database seed rows.

## `publishing-limits.json`

Provider posts and stories limits. Publishing is free for all providers; Pro only raises caps.

- `free.postsPerMonth`: free-tier monthly post cap.
- `free.storiesLiveAtOnce`: free-tier live story cap.
- `free.imagesPerPost`: free-tier media cap per post/story.
- `free.bodyMaxChars`: free-tier body text cap.
- `free.storyTextMaxChars`: free-tier text-only story cap.
- `free.storyCaptionMaxChars`: free-tier story caption cap when an image is attached.
- `pro.postsPerMonth`: Pro monthly post cap.
- `pro.storiesLiveAtOnce`: Pro live story cap.
- `pro.imagesPerPost`: Pro media cap per post/story.
- `pro.bodyMaxChars`: Pro body text cap.
- `pro.storyTextMaxChars`: Pro text-only story cap.
- `pro.storyCaptionMaxChars`: Pro story caption cap when an image is attached.
- `storyLifetimeHours`: how long a published story stays live.
- `expiredStoryMediaRetentionDays`: how long expired story media should be retained before any future purge.

Imported by `lib/provider-posts-config.ts`, then used by provider post/story actions, dashboard composer limits, and story expiry.

Should mirror any database constraints or migration seed comments related to posts/stories limits.

## `sponsored-placements.json`

Sponsored placement pricing and eligibility controls.

- `pricing[].placementType`: sponsored inventory type.
- `pricing[].priceRands`: flat price for the placement; `null` means not available for purchase.
- `pricing[].billingUnit`: billing unit for the flat price.
- `visibleSlots`: how many sponsored items are visible at once per placement surface.
- `slotInventoryPerScope`: how many active reservations can exist per placement/scope before reserve rules block paid purchase.
- `floatingBoxDismissalHours`: how long a visitor dismissal hides the floating sponsored box in that browser.
- `rotationWindowHours`: how often active sponsored reservations rotate through visible slots.
- `rescueGrantReservePct`: percent of slot inventory reserved for non-sellable rescue grants.
- `densityCapPerTen`: max sponsored slots per ten organic results.
- `minRatingThreshold`: minimum average rating for sponsored placement eligibility.

Imported by `lib/sponsored-config.ts`, then used by sponsored placement purchase, rendering, and eligibility checks.

Should mirror sponsored placement migration comments/schema assumptions. Sponsored placement must never affect organic ranking.

## `service-package-rules.json`

Validation and display guidance for service pricing packages.

- `title.minChars`: shortest accepted package name.
- `title.maxChars`: longest accepted package name.
- `title.maxWords`: maximum word count for package names, keeping public selectors readable.
- `title.allowedPattern`: server/client validation pattern for package names.
- `title.guidance`: provider-facing helper copy in package forms.
- `offerings.maxItems`: maximum included-items stored from package forms.
- `offerings.maxItemChars`: max stored length for each included item.

Imported by `lib/service-package-rules.ts`, then used by `lib/actions/services.ts` and `components/provider-dashboard/PackageFormClient.tsx`.

No database mirror. This is application validation and UI guidance for package creation/editing.

## `nurture-emails.json`

New provider and customer onboarding email sequence configuration.

- `batchSize`: max due queued emails the daily cron processes in one run; kept small for Vercel Hobby function duration.
- `maxAttempts`: retry ceiling before a queued email is marked failed.
- `provider.sequenceKey` / `customer.sequenceKey`: versioned sequence identifiers used in queue idempotency keys.
- `steps[].stepKey`: stable step identifier.
- `steps[].offsetDays`: day offset from enrollment; designed for once-daily Vercel Hobby cron precision.
- `steps[].subject`, `heading`, `body`, `bullets`, `ctaLabel`, `ctaPath`: email copy and CTA destination.

Imported by `lib/nurture-emails-config.ts`, then used by `lib/actions/nurture-emails.ts`.

Delivery state lives in `nurture_email_queue`; the config owns sequence copy and timing. Signup hooks enqueue the full sequence once, then send the day-0 welcome immediately. `/api/cron/nurture-emails` drains later due rows once per day.

## `browse.json`

Thresholds for the homepage/browse category and city tile grids.

Values whose `confirmed` flag is `false` are **suggested defaults awaiting sign-off** (`TODO(aya): confirm` in the entry's `_comment`). Do not treat them as agreed commercial terms.

- `minTileProviders.value`: minimum published providers for a category or city tile to appear on the homepage grid and browse category/city lists. Below this, the category/city page itself still renders (reachable by direct URL) but is `noindex, follow` until it crosses the threshold. **Unconfirmed — suggested 5.** Deliberately lower than `liquidity.json`'s `liquidCell.minProvidersPerCell` (8) — this only means "not embarrassingly empty" for a public tile, not "operationally liquid" for the internal dashboard.
- `defaultCity.value`: fallback city for the nav "near you" item when no cookie-persisted city, browser geolocation, or IP geolocation resolves to a known ZA city with live providers. **Unconfirmed — suggested "Cape Town".**

Imported by `lib/browse-config.ts`, then used by the homepage category/city filtering, `app/(public)/providers/category/[slug]/page.tsx`, `app/(public)/providers/in/[location]/page.tsx`, `app/(public)/browse/cities/page.tsx`, and `lib/geo-location.ts`.

No database mirror.

## `booking-lifecycle.json`

Timings, limits and thresholds for the service booking lifecycle: status transitions, the requirement/file exchange, booking messages, and reviews.

Values whose `*Confirmed` flag is `false` are **suggested defaults awaiting sign-off** (`TODO(aya): confirm` in the section's `_comment`). Do not treat them as agreed commercial terms.

- `autoComplete.daysAfterProviderComplete`: days a booking may sit in `completed_by_provider` before the system auto-confirms it. **Unconfirmed — suggested 7.**
- `autoComplete.enabled`: master switch for the auto-completion sweep. Ships `false`; `/api/cron/booking-expiry` reports how many bookings *would* auto-complete but transitions none until this is `true`.
- `autoComplete.confirmed`: tracks whether the window above has been signed off.
- `files.maxFileSizeMb`: **confirmed at 20 MB.** Largest single upload accepted on a booking.
- `files.maxTotalPerBookingMb`: ceiling on the combined size of all live files on one booking, deliberately generous so it never blocks normal use. **Unconfirmed — suggested 500.**
- `messaging.closeAfterCompletedDays`: days after a booking reaches `completed` before its thread goes read-only. **Unconfirmed — suggested 30.**
- `messaging.pollIntervalMs`: how often an open booking thread refreshes. A code constant, not a commercial value — the project uses no Supabase realtime, so booking threads poll.
- `notifications.nudgeRateLimitHours`: minimum gap between provider "nudge customer" reminder emails on one booking. **Unconfirmed — suggested 24.**
- `notifications.newMessageBatchWindowMinutes`: suppression window that stops a rapid exchange generating one email per message. **Unconfirmed — suggested 15.**
- `reviews.editableForDays`: how long a customer may edit their review before it locks. **Unconfirmed — suggested 14.**
- `reviews.providerReplyEditableForHours`: how long a provider may edit their public reply. **Unconfirmed — suggested 24.**
- `reviews.minReviewsToDisplayRating`: minimum published review count before a rating appears on search and listing cards. **Unconfirmed — suggested 1**; the key exists so the threshold can be raised later.

Imported by `lib/booking-lifecycle-config.ts`, then used by `lib/actions/booking-transitions.ts`, `lib/actions/booking-files.ts`, `lib/actions/booking-messages.ts`, `lib/actions/reviews.ts`, `lib/booking-emails.ts`, both booking detail pages, and `/api/cron/booking-expiry`.

**Database mirror:** `files.maxFileSizeMb` (20 MB) is mirrored as the `booking-files` storage bucket's `file_size_limit` (`20971520` bytes) in `supabase/migrations/20260818000001_booking_lifecycle_tables.sql`. Edit both together — the bucket limit is enforced by Supabase independently of the application check.

## `liquidity.json`

Thresholds for the internal liquid-cell dashboard and leakage-measurement tooling (admin-only; nothing here changes what a customer or provider sees).

Values whose `*Confirmed` flag is `false` are **suggested defaults awaiting sign-off** (`TODO(aya): confirm` in the section's `_comment`). Do not treat them as agreed commercial terms.

- `liquidCell.minProvidersPerCell`: minimum claimed, bookable providers for a category x city cell to count as liquid. **Unconfirmed — suggested 8.**
- `liquidCell.minResponseRate24h`: minimum share of bookings with a provider's first message within 24h of acceptance. **Unconfirmed — suggested 0.80.**
- `liquidCell.minCompletedBookings30d`: minimum completed bookings in the trailing 30 days. **Unconfirmed — suggested 1.**
- `leakage.windowDays`: days after a `service_viewed` funnel event before it counts as "viewed, never booked." **Unconfirmed — suggested 30.**
- `leakage.csvSampleSize`: max rows in one manual leakage-sample CSV export. **Unconfirmed — suggested 50.** This only backs a human-triggered export for phone/WhatsApp follow-up — nothing here sends outreach automatically.

Imported by `lib/liquidity-config.ts`, then used by the internal liquidity dashboard queries and the manual leakage-sample export.

No database mirror.

## `satisfaction.json`

Timing and copy for the two independent NPS survey flows: customer (fired once at booking completion) and provider (day 30 post-claim, then quarterly). The two sides are never blended — every read of `satisfaction_responses` filters on `side`.

Values whose `*Confirmed` flag is `false` are **suggested defaults awaiting sign-off** (`TODO(aya): confirm` in the section's `_comment`). Do not treat them as agreed commercial terms.

- `batchSize` / `maxAttempts`: cron batch size and max send attempts before a survey email is marked `failed`. Code constants, not commercial values — matches `nurture-emails.json`'s shape.
- `customer.delayHours`: hours after booking completion before the customer NPS email sends, offset from the immediate review-prompt email. **Unconfirmed — suggested 24.**
- `provider.firstSurveyDays`: days after claim (or signup, for providers with no claim flow) before the first provider NPS email. **Unconfirmed — suggested 30.**
- `provider.quarterlyIntervalDays`: gap between repeat provider NPS sends after the first. **Unconfirmed — suggested 90.**
- `customer.subject` / `.heading` / `.body` and `provider.subject` / `.heading` / `.body`: survey email copy, one set per side.

Imported by `lib/satisfaction-config.ts`, then used by `lib/actions/nps.ts` (enqueue, send, and submit) and the `/api/cron/nps-surveys` job.

No database mirror.
