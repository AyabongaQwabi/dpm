# ServicePros Marketplace Traction Decisions

Date: 2026-08-13
Source: user review of the Claude marketplace-traction analysis based on the YouTube talk transcript.

## Product Corrections

- ServicePros is not only a search-and-call directory. Each provider has services on the site, and services are bookable.
- There should be no generic homepage "quote request", no "book now" call-to-action detached from a provider service, and no guest quote-request flow for now.
- The primary nav location item is meant to represent the visitor's current location, but it must not show irrelevant non-South-African places. If the location cannot be resolved confidently, use a neutral fallback.
- Empty categories may be hidden from the homepage to avoid sending visitors into empty supply.
- The city tiles on the homepage are provider-presence cities, not a claim that every South African city is covered.
- Claim-your-listing has already been implemented.
- Embeddables are acceptable as a direction and do not need to be removed from the roadmap.
- The current monetization model uses credits; Yoco must not be used for provider invoicing/payment-link products that conflict with its policies.

## Approved Now

- Keep service-level booking as the transaction surface.
- Hide homepage categories with no providers.
- Fix current-location display so non-SA Vercel geo results do not appear as served locations.
- Treat Profile Analytics as a ceiling-package perk from Package 2 upward, even if a thinner version also exists under Pro membership.

## Not Possible Yet

- Free hosted micro-sites for providers without websites: blocked by the current Vercel free-plan constraints and no programmatic microsite infrastructure.
- Embeddable price guide: blocked until ServicePros has trustworthy service-price data.
- Programmatic location by category by suburb SEO: blocked until provider density, city/suburb normalization, and content quality are ready.
- Transparent pre-contact expectations: blocked until reliable price, callout, and response data exist.
- Invoicing and payment links via Yoco: rejected for now because of Yoco policy constraints and the existing credits model.

## Later / Keep As Notes

- White-label distribution.
- WhatsApp-first enquiry rail, with the concern that visible WhatsApp CTAs may move bookings off-platform.
- Job scheduling with reminders.
- Onboarding wizard with completeness score.
- Provider mobile PWA with push.
- Team seats.
- Provider quality score.
- Human concierge for high-value jobs.
- Annual prepay.
- Commission at scale.
- Platform partner take rate.
- Corporate and property-manager accounts.
- Anonymised market insight reports.
- AI and automation.
- Long-term strategic bets.

## Open Concern

- Branded quote builder with PDF output needs further business-model review, because it may encourage providers to move customer work outside ServicePros unless designed as a controlled provider-retention tool.
