# Scraping, claimable profiles, billing at signup, and billing dashboard

## Goal

Enable Google Places business scraping into claimable provider profiles, email-verified ownership claims, base R99 subscription billing at onboarding completion, and a provider billing dashboard with expiry handling.

## Context

- `providers` already has `slug`, `location_city`, `location_state`, `onboarding_step`, `is_published`
- Phone/website live in dynamic `provider_field_values` for onboarded providers
- `provider_ceiling_subscriptions` exists for commission ceiling packages; no base subscription table
- Paystack is credits-only today; R99 renewal on expiry is in scope; ceiling upgrade payment is not
- Resend is not yet integrated

## Scope

- Schema: claim columns, `profile_claims`, `provider_subscriptions`
- `scripts/scrape-businesses.mjs` (offline, no Supabase connection)
- Claim flow: `/claim/[slug]` + verify pages
- Unclaimed profile banner; hide booking CTAs
- Onboarding completion → package 1 subscription row
- `/provider-dashboard/billing` + overview card
- Subscription expiry cron + reminder emails
- R99 Paystack renewal (initialize, webhook, return verify)

## Out of scope

- Admin claim review UI
- Paystack for ceiling package upgrades (display only)
- Automated provider payouts

## Implementation order

1. Migrations
2. Scraper script
3. Slug utility
4. Unclaimed profile UI
5. Claim flow + Resend
6. Onboarding billing bootstrap
7. Billing dashboard + Paystack renewal
8. Expiry cron + `vercel.json`

## Acceptance

- Scraper outputs JSON + SQL without DB connection
- Unclaimed profiles show claim banner; no Book/Order CTAs
- Claim: email → code → auth user → onboarding with pre-fill banner
- Onboarding end creates `provider_subscriptions` (package 1)
- Billing page shows plan, dates, disabled upgrade cards
- Cron expires subscriptions, unpublishes providers, sends emails
- R99 renewal extends subscription and re-publishes profile
- `npm test`, `tsc --noEmit`, `npm run build` pass
