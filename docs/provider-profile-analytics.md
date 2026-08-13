# Provider Profile Analytics

## Purpose

Provider Profile Analytics gives eligible providers a clearer view of how their ServicePros profile is performing. It is a ceiling-package perk and a Pro membership perk: a provider can see analytics when `hasEntitlement(ENTITLEMENT_KEYS.ANALYTICS)` returns true.

That entitlement is backed by `pro_memberships`. Package purchases for packages 2-5 create or refresh a real `pro_memberships` row with `source = 'package_included'`, so the dashboard does not need a separate package-number gate.

The dashboard shows:

- Profile views and service views from `funnel_events`.
- Bookings started and bookings completed from `booking_status_history`.
- Booking conversion rate from started to completed.
- Review count and average rating from published reviews.
- Median provider response time using the shared liquidity response-time loader.
- Category-city median comparisons when enough providers exist in the same category and city.

Comparisons are hidden when the category-city sample is smaller than `analytics.minComparisonSample` in `config/platform-config.json`. The current default is `5` and is marked in code as `TODO(aya): confirm`.

## Data Flow

Public pages write narrow funnel events:

- Provider profile pages emit `profile_viewed`.
- Service pages emit `service_viewed`.
- Search pages continue to emit `search_performed`.
- Review submission continues to emit `review_submitted`.

The provider dashboard calls `loadProviderAnalyticsSummary()`, which:

- Returns no metrics when the analytics entitlement is denied.
- Computes 7, 30, and 90 day summaries.
- Finds peer providers in the same category and city.
- Uses the shared `median()` helper from `lib/domain/liquidity.ts`.
- Reuses `loadProviderResponseStats()` from `lib/liquidity/cell-stats.ts` for response-time calculations.

Weekly digest emails use a queue-based Resend pattern, similar to nurture emails:

- `provider_notification_preferences` stores `analytics_digest_opt_in` and an unsubscribe token.
- `analytics_digest_queue` stores queued/sending/sent/failed digest jobs.
- `/api/cron/analytics-digest` is scheduled daily for Vercel Hobby compatibility, but enqueues only on Mondays.
- `/api/provider-analytics/unsubscribe?token=...` opts a provider out of future digests.

## How To Test

Run the standard checks:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

Manual dashboard checks:

1. Apply migrations, including `20260823000000_provider_analytics_digest.sql`.
2. Create or choose a Package 1 provider with no active `pro_memberships` row.
3. Open `/provider-dashboard` as that provider and confirm the analytics panel is locked.
4. Create or choose a Package 2 provider whose package purchase has written an active `pro_memberships` row with `source = 'package_included'`.
5. Open `/provider-dashboard` and confirm the analytics panel is visible.
6. Create or choose a Package 1 provider with an active standalone Pro row, `source = 'purchased'`.
7. Open `/provider-dashboard` and confirm the analytics panel is visible.

Manual data checks:

1. Visit a provider profile page and confirm a `funnel_events` row with `event_type = 'profile_viewed'`.
2. Visit a service page and confirm a `funnel_events` row with `event_type = 'service_viewed'`.
3. Create enough same-category, same-city peer providers to meet `analytics.minComparisonSample`.
4. Confirm dashboard medians appear.
5. Lower the peer sample below the threshold and confirm the dashboard shows the “not enough providers in your category and city yet to compare” note instead of medians.

Manual digest checks:

1. Ensure `RESEND_API_KEY` and `CRON_SECRET` are configured.
2. Call `/api/cron/analytics-digest` with `Authorization: Bearer <CRON_SECRET>`.
3. On Mondays, confirm eligible providers get queued in `analytics_digest_queue`.
4. Confirm opted-out providers are skipped.
5. Open the unsubscribe link from a digest and confirm `provider_notification_preferences.analytics_digest_opt_in` becomes `false`.
