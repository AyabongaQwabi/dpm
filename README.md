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

## Payments (Yoco)

Credit purchases and provider subscription renewals go through the
[Yoco Checkout API](https://developer.yoco.com/api-reference/checkout-api).
Yoco has no verify-by-reference endpoint, so **payment confirmation is
webhook-only** — `app/api/webhooks/yoco/route.ts` is the single writer of
credit/subscription state. The return page the customer lands on
(`/customer-account/credits` or `/provider-dashboard/billing`) just polls the
DB briefly for what the webhook already wrote.

### One-time webhook registration

Register the webhook once per environment (once for local/staging via a
tunnel URL, once for production) by calling Yoco's Webhooks API directly —
there's no dashboard UI for this:

```bash
curl -X POST https://payments.yoco.com/api/webhooks \
  -H "Authorization: Bearer $YOCO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dpm-payments",
    "url": "https://<your-deployed-domain>/api/webhooks/yoco"
  }'
```

The response includes a `secret` field (`whsec_...`) — **copy it immediately,
it is only ever shown once**. Set it as `YOCO_WEBHOOK_SECRET` in your
environment (Vercel project env vars for prod/preview, `.env.local` for dev).
Without it, `/api/webhooks/yoco` rejects every request with 401 (it verifies
the `webhook-signature` header against this secret before trusting anything).

For local development, Yoco needs a publicly reachable HTTPS URL — use a
tunnel (e.g. `vercel dev` with a preview deployment, or `ngrok http 3000`) and
register that tunnel URL instead of `localhost`. Re-register (new secret) any
time the tunnel URL changes.

To list or remove a registered webhook:

```bash
curl https://payments.yoco.com/api/webhooks -H "Authorization: Bearer $YOCO_SECRET_KEY"
curl -X DELETE https://payments.yoco.com/api/webhooks/<id> -H "Authorization: Bearer $YOCO_SECRET_KEY"
```

## Stack

- **Framework:** Next.js (App Router), TypeScript
- **Hosting:** Vercel
- **Database:** Postgres via Neon (serverless, with database branching)
- **ORM:** Prisma
- **Auth:** Managed auth provider (Clerk recommended)
- **File storage:** Vercel Blob
- **Payments:** Yoco
- **Email:** Resend
- **Scheduled jobs:** Vercel Cron

See [providers_platform_tech_stack_architecture.docx](docs/providers_platform_tech_stack_architecture.docx) for the rationale behind each choice.
