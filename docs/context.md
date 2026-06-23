# DPM — Directory Provider Maker

## What this is

DPM is a **multi-vertical service provider marketplace platform**, not a single
website. It's the underlying system that powers multiple separately-branded
directory/marketplace sites — one for cleaning services, one for event vendors, one
for security companies, and so on — all running from the same codebase and the same
database, distinguished only by which provider category each deployment shows.

It's a directory (businesses get a findable, SEO-indexed profile) and a marketplace
(customers can book and pay through the platform, providers can hire business-support
partners through the platform) combined into one system. The working assumption
going in was that this specific combination — multi-vertical, directory plus
booking plus an internal services marketplace — doesn't have an obvious existing
competitor doing exactly this.

## The three actor types

**Customers** — the public. Find a provider through search (e.g. "cleaning services
in Queenstown"), browse provider profiles, view a feed of providers' social-style
posts, create an account to book a provider, and can only leave a review after a
booking is marked complete by the provider.

**Providers** — the businesses being listed (a cleaning company, a wedding DJ, a
security firm). They create a profile, list services, manage incoming bookings,
post content to their feed, and can separately browse and hire **partners** for
business-support services.

**Partners** — internal-only, not public or Google-indexable, shared across every
vertical. They offer business-management services to providers: business
registration, compliance, brand/graphic design, copywriting, social media content
creation, and similar. Providers see partner services as cards with a few details,
not a browsable directory — they view a partner's full profile only once they're
specifically interested.

## Why multi-vertical, one system

Different verticals contain genuinely different provider types with different
information needs. An event-services vertical alone contains both DJs (who need a
sample-mix upload, event types serviced, typical audience) and caterers (who need
cuisine types, dietary options) — both still "event service providers," but needing
different profile fields. Cleaning services and security companies need their own
different fields entirely.

Rather than building a separate app per vertical, or a separate app per provider
type, DPM uses **one configurable core application and one shared database**:

- Each vertical (cleaningservices.co.za, eventvendors.co.za, etc.) is the same
  codebase, deployed once, with the active site resolved by which domain the
  request came in on — not a separate deployment per vertical.
- A **home marketplace** site sits over the same database, unfiltered, showing
  providers from every vertical at once, plus a provider search and featured
  providers/specials on its landing page.
- Partners are shared across every vertical too — one set of partners, available to
  providers regardless of which vertical they're listed in.

This is the "plug and play for future SaaS opportunities" idea: adding a new
vertical should mean registering a domain and adding configuration, not writing new
application code.

## How different provider types are handled without different databases

Rather than a fixed schema per provider type (which would mean a database
migration every time a new type is added), DPM uses a **configuration-driven
dynamic schema**:

- A global, reusable registry of **fields** (e.g. "cuisine types," "sample mix
  upload," "service area") each with an input type and optional validation rules.
- **Provider types** (DJ, caterer, security guard, etc.) each have a **form
  configuration** — an ordered list of which fields apply to that type, presented to
  the provider in steps during onboarding.
- Not every field needs validation — only the ones that matter are marked required.
- This means adding a new provider type, or a new field, is a configuration change,
  not a code change.

Every provider, regardless of type, also has a fixed set of fields that don't vary:
business name, gallery, rich-text bio, profile picture, FAQs, tags, and links.

**Services are uniform across every provider type** — no dynamic schema needed here.
Every provider's services have the same shape: image, title, description, price,
and a discount (either a flat amount or a percentage).

## The booking and review loop

A customer selects a specific service when booking a provider. The provider accepts
or declines. Once the provider marks the booking complete, two things become
possible: the customer can leave a review (and only then — a customer who hasn't
actually received the service can't review the provider), and the provider's payout
for that booking is triggered.

## Monetization

- **Providers pay to be listed** — DPM takes a cut when a provider is hired/booked
  by a customer, and a cut on services providers purchase from partners through the
  platform. Both cuts are intentionally modest, not maximized.
- **An early, since-evolved idea**: bundle a free graphic-design credit allowance
  into every provider's listing (e.g. enough credits for one logo or one banner),
  with paid top-ups beyond that, and a broader marketplace where partners — including
  independent graphic designers — could price their own services, similar in spirit
  to a freelancer marketplace. This surfaced while exploring how to combine
  directory listings with a design-services add-on, and is part of the platform's
  origin thinking rather than a committed v1 feature — the **partners system** (see
  above) is the part of this idea that's been carried forward into the actual spec,
  in a simpler form: partners offer services (including design) directly to
  providers, without a bundled-credits mechanic baked into the listing fee itself.

## What it's explicitly not (yet)

- Not a generic AI design-generation tool, and not a Canva-style template store —
  earlier exploration considered and moved away from those framings specifically
  because they compete directly with free AI tools small businesses already have
  access to, rather than offering something those tools can't.
- The **partners app** (the separate dashboard where partners manage their own
  profile, services, and articles) is a distinct, simpler system from the providers
  platform — referenced and connected to it, but specified separately.
- Provider availability/calendar conflict checking, content moderation policy, and
  partner-to-provider payment mechanics are acknowledged open areas, not yet fully
  specified.

## Where this stands

This context sits alongside four detailed build documents that take the ideas above
and turn them into an actual implementable specification:

1. **PRD** — entities, requirements, the full dynamic-schema data model
2. **Business logic spec** — the booking state machine, commission calculation,
   search ranking and paid-placement rules
3. **Tech stack & architecture doc** — Next.js on Vercel, Supabase for database/auth/
   storage, hostname-based multi-tenancy
4. **Database schema reference** — the full table-by-table schema

This document is the plain-language entry point; those four are the implementation
source of truth.