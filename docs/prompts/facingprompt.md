# The DPM engine phase: public pages, theming, and seed data

## Status
Scoping document, written before any implementation. Per the instruction this
responds to: write this doc first, then use it to drive the actual build prompt(s)
to Claude Code afterward. Nothing in this phase touches authentication or the
customer/provider dashboards — those are explicitly deferred to the next iteration.

## What's being built in this phase

Five page categories, a full per-subdomain theming system, and a seed/destroy
script \u2014 explicitly NOT auth, NOT the customer dashboard, NOT the provider
dashboard. Those are confirmed next-iteration.

### 1. Public pages

| Page | Purpose |
|---|---|
| Home | Hero, provider search, featured providers, additional sections (open to brainstorming \u2014 see Section 5) |
| Content | Feed of social-style posts from multiple providers (PRD Section 13) |
| Services | Browsable view across provider services |
| Provider profile | One page template handling every provider type's varied data, tabbed: profile/overview, content, services, reviews |
| Providers in [location] | A landing page shaped for how people actually search \u2014 "cleaning services in Queenstown" \u2014 and for how Google indexes that intent |
| Paginated provider list | The general browse/search-results view |
| Auth pages | Sign-up and login for both customers and providers \u2014 the PAGES only, not real auth wiring (see Section 3) |
| Standard pages | Terms, privacy, about, and similar |

### 2. One provider profile page, many provider types

This is the core technical challenge of this phase: a single page template needs
to render correctly for a caterer, a DJ, a cleaning company, and a security firm,
each with different dynamic fields per the schema doc's provider_field_values
system. The page should be data-driven from each provider's resolved field set
(per their provider_type's form_config), not a separate template per type \u2014
consistent with the PRD's PROV-002 requirement that provider cards/profiles be
data-driven rather than hardcoded per type.

Tabs: profile/overview (fixed fields + dynamic fields), content (that provider's
posts), services, reviews.

### 3. Auth pages without auth logic

Sign-up and login pages (separately for customers and providers) should be built
as real, polished UI \u2014 but without functional authentication wired up yet, per the
explicit instruction to defer auth. Treat these as static/UI-only at this stage;
wiring them to Supabase Auth is next-iteration work, alongside the dashboards
those pages lead into.

### 4. Per-subdomain theming

Each vertical's subdomain/site must be independently themeable:
- A color scheme appropriate to that vertical's industry (e.g. likely cooler/
  clinical tones for security, warmer tones for events) \u2014 configured per tenant,
  not hardcoded per page.
- Both light and dark mode, each toggleable by the visitor and defaulting to the
  visitor's system preference automatically.
- This extends the tenant_branding table already defined in the schema doc
  (Section 3.7) \u2014 theme_color exists there already as a single value; this phase
  likely needs that broadened into a fuller per-tenant theme token set (e.g. a
  small palette, not just one accent color) to support both an industry-appropriate
  scheme AND light/dark variants of it. This is flagged as a probable schema
  change, not assumed silently \u2014 see Section 6.

### 5. Home page hero and sections \u2014 open for brainstorming

The instruction explicitly invites brainstorming here rather than prescribing every
section. Treat the hero and supporting sections as a design exploration, not a
fixed checklist \u2014 informed by what similar marketplace/directory sites do well,
but adapted to a South African multi-vertical context rather than copied.

### 6. Database changes anticipated by this phase

Two areas are flagged in advance as likely needing schema changes, beyond what's
in the current schema doc:

- **Featured providers**: the schema doc and PRD both reference "featured
  providers" (home marketplace landing page) without ever defining how a provider
  becomes featured \u2014 this was an acknowledged open item (schema doc, business
  logic Section 4.3 / RANK-LOGIC-007), not an oversight introduced now. This phase
  needs to resolve it, even if minimally (e.g. a simple `is_featured` boolean and
  a manual curation process for v1, rather than a fully automated mechanism).
- **Tenant theming**: per Section 4 above, tenant_branding likely needs more than
  a single theme_color field to support industry-appropriate palettes plus light/
  dark variants.

Any schema change made during this phase must ship as an actual migration file
(per the now-Supabase-native migration approach \u2014 see the Prisma-to-Supabase
decision doc), not a silent, undocumented change to the live database.

### 7. Images

Pexels and/or Unsplash APIs are to be used for placeholder/stock imagery (hero
images, provider gallery placeholders during seeding) via API keys expected in
`.env.local`. This is for seed/placeholder content specifically \u2014 not a
commitment to stock imagery as the permanent visual identity of the platform.

### 8. Seed and destroy scripts

A seed script populating:
- 10 cleaning-category providers
- 10 event-category providers
- 10 legal-category providers
- 5 providers in other/unspecified categories
- Each seeded provider should have a believable gallery, profile picture, bio,
  at least one service, and at least one social content post, so the UI being
  built in this phase has real-looking data to render against, not empty states.
- A reasonable spread of reviews per provider, since the review tab needs content
  to be evaluated visually.
- A destroy script that cleanly removes everything the seed script created,
  allowing a repeatable reset-and-reseed cycle during development.

Per the explicit instruction: auth is not part of this seeding. Seeded providers
exist as data only, not as logged-in-able accounts \u2014 consistent with auth being
out of scope for this whole phase.

## Explicitly out of scope for this phase

- Functional authentication (Supabase Auth wiring)
- Customer dashboard
- Provider dashboard
- Booking flow functionality (the booking *button* may appear in the UI, but
  doesn't need to functionally create a booking yet)
- Partner-facing pages/app

## Suggested order of work

1. Resolve the featured-providers and tenant-theming schema questions (Section 6)
   and ship migrations for both before building pages that depend on them.
2. Build the seed and destroy scripts against the (now slightly extended) schema,
   so every subsequent page can be built and visually checked against real data
   immediately rather than mocked data.
3. Build the provider profile page template (Section 2) next, since it's the most
   structurally demanding piece (one template, many provider types) and validates
   the dynamic-field rendering approach before it's reused elsewhere.
4. Build the remaining public pages (home, content, services, location, paginated
   list).
5. Build the static auth-page UI and the standard pages (terms, privacy, about)
   last \u2014 they're the least structurally risky part of this phase.
