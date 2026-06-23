# Provider dashboard + services + purchase flow — build prompt

## Confirmed: the service article is compulsory

Resolved directly by the person: every service requires a written article —
no service can be published with only pricing and no explainer/images
attached. The rest of this prompt is written on that basis.

---

## 1. Post-signup flow

A provider, immediately after completing sign-up, must be routed directly
into the onboarding flow — never to a login screen or an intermediate
"welcome" page requiring a separate sign-in action. Sign-up and the start of
onboarding should feel like one continuous flow, not two separate steps with
a wall between them.

## 2. Onboarding scope — what gets collected, what doesn't

Onboarding collects everything that displays on the provider's public
profile: business basics, the existing fixed and dynamic fields per the
schema's provider-type system, **plus three additions not currently in the
schema**:

- Social media links
- Languages spoken
- Portfolio information — explicitly **optional**, not required to complete
  onboarding

**Services are explicitly excluded from onboarding.** A provider completes
onboarding with a published profile and zero services. Service creation
happens entirely on the dashboard, after onboarding, as its own flow.

**Schema note for Claude Code:** social links and languages should be modeled
as dynamic fields through the existing field-configuration system (PRD
Section 6) if they vary in structure by provider type, or as fixed columns
on the provider record if every provider type captures them identically —
confirm which fits before implementing, since fixed-field social
links/languages may not need the dynamic-field machinery at all if every
provider type wants the exact same shape.

## 3. Post-onboarding nudge toward services

Immediately after a provider completes onboarding and lands on their
dashboard for the first time, show a help bubble / contextual tooltip
pointing them toward "My Services" as the next step, since a published
profile with no services isn't bookable yet. This should be dismissible and
shouldn't reappear once the provider has created at least one service.

---

## 4. Provider dashboard structure

A sidebar-navigated dashboard with the following sections:

### Messages
Conversation threads between the provider and their customers. A thread is
created automatically the moment a customer pays for a service from this
provider — both sides get the other added as a contact with an empty message
history to start from. Every thread is linked to (and should visibly
reference) the specific service the conversation is about.

### My Sales
Recent purchases from customers, showing purchase details (service, package
tier selected, price paid, date, customer).

### My Services
Where the provider creates and manages services. See Section 5 below for the
full service data model — this is the most structurally involved part of
this build.

### Profile
Editing the provider's own profile details, organized into its own tabs
(mirroring the onboarding step groupings is a reasonable default — confirm
with the person if a different tab grouping is wanted).

---

## 5. Service data model — additions to the existing schema

Beyond the service fields already defined in the schema doc (image, title,
description, price, discount_type, discount_amount), each service now also
needs:

### Service article (compulsory)
A rich-text article about the service, capable of rendering embedded images
and embedded YouTube videos in addition to formatted text. **No service may
be published without one** — pricing packages alone are not sufficient; every
service needs a real explainer, not a bare price list. **Technical approach:
use a lightweight rich-text editor (Quill or a comparable option like Tiptap)
writing to a rich-text/JSON column on the service record — do NOT introduce a
separate headless CMS (e.g. Payload) for this.** A full CMS is unnecessary
overhead for a single-author-per-service authoring flow and would mean
maintaining a second content system alongside the database. Images
referenced in the article should be uploaded to Supabase Storage (the
storage provider already in use elsewhere in this project) with the
resulting URL inserted into the rich-text content — do not store image
binary data in the database.

The article must be rendered on the public service detail page whenever a
customer views that service, displayed alongside the pricing packages.

### Pricing packages
Each service has one or more pricing packages. A provider must be able to
create a service with just a single package (for services with one flat
price) — labeling for a lone package should still make sense on its own
(e.g. simply show the package without a "basic/standard/premium" tier label
if there's only one). When multiple packages exist, the convention is basic
→ standard → premium, ascending in price.

**Default package for display**: exactly one package per service must be
flagged as the default (`is_default`, enforced as one-per-service at the
application or database constraint level). Anywhere a service appears as a
card or listing with a single price/discount shown (search results,
recommended services, provider profile grid), that price and discount come
from the default package — never the cheapest or first-created package by
convention. The provider must be able to explicitly choose/change which
package is the default from the dashboard.

Each package captures:
- Description
- Price
- Discount (percentage or flat Rand amount — reuse the existing
  discount_type/discount_amount pattern already established for services)
- Offerings — what's included / what the provider will do for the client at
  this tier
- Requirements (free text describing what the client needs to provide)
- Requirement file slots — named placeholders for files the client must
  upload (the provider should be able to define multiple named requirement
  file slots per package, e.g. "venue floor plan," "guest list")
- Delivery time (how long the provider will take to complete the service at
  this tier)

### Service reviews — confirmed design
A review attaches to the **service as a whole**, not to an individual
package — one rating pool per service, so review volume isn't fragmented
across tiers (this matters directly for the volume floor in Section 6: a
service split into three thin per-package review pools would take three
times as long to clear eligibility).

Each review additionally **captures which package the reviewer was on** as
display metadata (e.g. "4 stars — Basic package"). This is shown alongside
the review wherever reviews are displayed, but is **not** used as a ranking
or weighting factor — a premium-tier review does not count for more than a
basic-tier review in the service's rating or in the recommendation ranking
(Section 6). The reasoning: package tier is a price/scope choice, not a
quality dimension, and weighting by tier would implicitly value a premium
customer's opinion over a basic customer's, which doesn't reflect anything
real about service quality and risks skewing rankings toward
revenue-per-booking rather than genuine quality. The package tag exists
purely so a reader can resolve disputes like "the provider didn't deliver X"
by checking whether X was actually included in that reviewer's tier — it's
context for humans reading reviews, not an input to the automated score.

---

## 6. Recommended services — ranking rules

Surfaces in two places: a "Recommended services" section on the home page,
and a "Recommended" or "Top services" tab on each provider's profile (scoped
to just that provider's own services).

**Tenant scoping**: reuse the existing tenant-resolution context
(`lib/tenant.ts`) already driving every other page — no new mechanism
needed. On a vertical deployment (e.g. the cleaning site), only cleaning-
category services are eligible. On the unscoped home marketplace, rank
across every category together.

**Eligibility — volume floor**: a service must have a minimum number of
reviews before it's eligible for recommendation at all (proposed default:
5+ reviews — flag as configurable, not hardcoded, consistent with how other
business-tunable values in this project are handled via platform_config).
Without this floor, a brand-new service with one or two friendly reviews
could outrank a genuinely proven one purely on a high ratio with no real
evidence behind it.

**Ranking signals, combined similar in shape to the existing search
relevance scoring (business logic Section 4.1) — weighted, configurable,
not hardcoded**:
- Recency-weighted rating: recent reviews count more than old ones, so a
  service whose quality has dropped recently doesn't keep coasting on old
  praise.
- Booking volume as its own signal, separate from rating: "successful"
  should mean well-reviewed AND actually booked at real volume, not just a
  high rating with very few data points.
- Reliability penalty inherited from the provider-level reliability signal
  already defined (business logic ranking section) — a great service from an
  unreliable provider (high cancellation/auto-expiry rate) should not be
  recommended.
- Completion-to-review ratio as a trust signal: compare completed bookings
  against actual reviews received, as a sanity check against review
  manipulation, rather than as a direct ranking boost.

**New services aren't penalized, just not yet eligible** — they simply
haven't cleared the volume floor yet.

**Explicitly not decided here, don't extend silently**: whether
recommended-services placement can also be paid/boosted the way search
results can (business logic Section 4.2). Treat as a separate open question,
not something to fold into this work without asking first.

---

## 7. Purchase flow

When a customer clicks through to buy/book a service: render the service's
article (Section 5) and its pricing packages, and let the customer choose a
package and proceed.

**No cart.** A single, direct path from "choose a package" to checkout for
one service at a time, rather than a multi-item cart. DPM's services are
predominantly being hired (a DJ, a caterer, a security shift) rather than
purchased as interchangeable commodities, and a cart introduces real added
complexity — multi-provider checkout, mixed commission calculations across
providers in a single cart, partial-failure handling — for a use case that
doesn't currently call for it. Revisit only if there's real demand for
buying from multiple providers in a single checkout later.

**CTA wording**: follow the time-based-vs-fixed-deliverable distinction
already established for this project — "Book" or "Request to Book" for
services tied to a specific time/availability (a DJ's wedding slot, a
security shift), "Order" or "Get Started" for fixed-deliverable services
with no time dimension. Don't standardize on one word for every service
type.

---

## 8. Schema changes, migrations, and reseed

This brief grows the schema meaningfully: service articles, pricing packages
(with a default-package flag), package-tagged reviews, plus the new
onboarding-collected fields (social links, languages, portfolio). Write
proper migration files for all of it, following this project's existing
Supabase-migration convention (plain SQL files under
`supabase/migrations/`) — do not hand-edit the database out of band.

**Existing seed data should be destroyed and fully replaced, not patched.**
The current seed data was built around the old service shape (no articles,
no packages, no package-tagged reviews) and patching it in place would leave
inconsistent records — some seeded services with the new fields, some
without. Use the project's existing destroy-seed script first, then write a
new seed script reflecting the full updated shape: every seeded service
needs at least one package (with one flagged default), a compulsory article,
and a believable spread of reviews tagged with varying package tiers, so the
new UI (package display, default-package pricing on cards, review package
tags) has real data to render against immediately.