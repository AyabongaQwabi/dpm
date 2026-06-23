# DPM — Directory Provider Maker

DPM is a multi-tenant, multi-vertical service marketplace. A single core application and a single shared database support multiple independently branded front-end sites ("verticals"), each scoped to one service category (e.g. cleaning services, event services, security services). On each vertical site, customers can search for and discover service providers, view provider profiles and the services they offer, and book providers directly through the platform. Providers manage their own profile, services, and bookings through a provider dashboard. The platform charges a commission on services booked and paid through the platform. A separate, unfiltered "home marketplace" deployment aggregates providers across all verticals into a single site.

## Source of truth

All product behaviour, business rules, data structure, and architecture decisions are defined in these four documents:

| Document | Purpose |
|---|---|
| [providers_platform_prd.docx](docs/providers_platform_prd.docx) | Product requirements — features, actors, rules |
| [providers_platform_business_logic.docx](docs/providers_platform_business_logic.docx) | Business logic — booking state machine, commission, ranking, onboarding |
| [providers_platform_tech_stack_architecture.docx](docs/providers_platform_tech_stack_architecture.docx) | Architecture — stack choices, multi-tenancy, deployment, infra |
| [providers_platform_db_schema.docx](docs/providers_platform_db_schema.docx) | Database schema — Prisma appendix is the authoritative schema definition |

Do not invent requirements not present in these documents. Where a requirement is marked as an open question or "BUSINESS DECISION REQUIRED", stop and ask the project owner before implementing.

## Getting started

```bash
cp .env.local.example .env.local
# Fill in real values in .env.local (never commit it)
npm install
npm run dev
```

The app fetches all of its data from Supabase. You **must** set the Supabase
variables in `.env.local` before running the dev server — otherwise the page
renders only the header and footer with empty/broken content in between. See
[`.env.local.example`](.env.local.example) for the full list of variables and
where to find them.

## Stack

- **Framework:** Next.js (App Router), TypeScript
- **Hosting:** Vercel
- **Database:** Postgres via Neon (serverless, with database branching)
- **ORM:** Prisma
- **Auth:** Managed auth provider (Clerk recommended)
- **File storage:** Vercel Blob
- **Payments:** Paystack
- **Email:** Resend
- **Scheduled jobs:** Vercel Cron

See [providers_platform_tech_stack_architecture.docx](docs/providers_platform_tech_stack_architecture.docx) for the rationale behind each choice.
