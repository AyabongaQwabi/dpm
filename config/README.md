# Config Files

Configuration in this folder is for business-editable values that should not be repeated across pages, actions, and tests. Import JSON through a small typed module in `lib/` rather than reading these files directly from many places.

When adding a new `config/*.json` file, document it here in the same change: what each setting means, where it is imported, and whether it mirrors database or migration values.

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

Imported by `lib/entitlements.ts`, then used by Pro purchase, package-included Pro, gallery/listing caps, and entitlement tests.

Mirrors the Pro membership migration’s intended commercial values; keep migration comments/seeds aligned if that migration changes.

## `publishing-limits.json`

Provider posts and stories limits. Publishing is free for all providers; Pro only raises caps.

- `free.postsPerMonth`: free-tier monthly post cap.
- `free.storiesLiveAtOnce`: free-tier live story cap.
- `free.imagesPerPost`: free-tier media cap per post/story.
- `free.bodyMaxChars`: free-tier body text cap.
- `pro.postsPerMonth`: Pro monthly post cap.
- `pro.storiesLiveAtOnce`: Pro live story cap.
- `pro.imagesPerPost`: Pro media cap per post/story.
- `pro.bodyMaxChars`: Pro body text cap.
- `storyLifetimeHours`: how long a published story stays live.
- `expiredStoryMediaRetentionDays`: how long expired story media should be retained before any future purge.

Imported by `lib/provider-posts-config.ts`, then used by provider post/story actions, dashboard composer limits, and story expiry.

Should mirror any database constraints or migration seed comments related to posts/stories limits.

## `sponsored-placements.json`

Sponsored placement pricing and eligibility controls.

- `pricing[].placementType`: sponsored inventory type.
- `pricing[].priceRands`: flat price for the placement; `null` means not available for purchase.
- `pricing[].billingUnit`: billing unit for the flat price.
- `rescueGrantReservePct`: percent of slot inventory reserved for non-sellable rescue grants.
- `densityCapPerTen`: max sponsored slots per ten organic results.
- `minRatingThreshold`: minimum average rating for sponsored placement eligibility.

Imported by `lib/sponsored-config.ts`, then used by sponsored placement purchase, rendering, and eligibility checks.

Should mirror sponsored placement migration comments/schema assumptions. Sponsored placement must never affect organic ranking.
