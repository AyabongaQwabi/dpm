@AGENTS.md

# DPM — coding rules

## Data access: Supabase only, no ORM

All database access goes through the Supabase JS client directly. There is no Prisma, no ORM, no query builder. Do not introduce any.

- **Server components and route handlers**: import `createClient` from `@/lib/supabase/server` and call `await createClient()` at the top of the function.
- **Server actions that write data**: import `createAdminClient` from `@/lib/supabase/admin` for writes (bypasses RLS). Use the server client (anon key) for reads.
- **Client components**: import `createClient` from `@/lib/supabase/client`.
- **`proxy.ts`** (middleware): imports directly from `@supabase/supabase-js` with the service-role key — no cookie context available there.

Never import from `@prisma/client`, `lib/prisma`, or any ORM package. If you see such an import, remove it.

## Auth and session resolution

- Auth is **Supabase Auth** (email/password). No Clerk, no NextAuth.
- `lib/session.ts` exports `requireProviderSession()` and `requireCustomerSession()` — call these at the top of guarded server components and route handlers.
- The provider dashboard **layout** only checks for a Supabase session (not a Provider row) to avoid a redirect loop for new sign-ups. Individual pages call `requireProviderSession()` themselves.
- Session → entity mapping is via `auth_provider_id` column on `providers` and `customers` tables.

## Database

- Schema lives in `supabase/migrations/20260620000000_init.sql`. Single baseline migration.
- Column names are `snake_case` (Supabase convention). JS field access uses `row.business_name`, not `row.businessName`.
- Types live in `lib/db.ts` (hand-written stubs). Replace with generated output of `supabase gen types typescript` once the project is linked.
- Supabase returns joined relations as arrays when using `select()` with embedded relations — always handle both `Array.isArray(row.relation)` and the single-object case.
- `NUMERIC` columns come back as `number` from supabase-js (unlike Prisma's `Decimal` objects). No `.toNumber()` needed.

## Tenant resolution

- `proxy.ts` runs on every request, looks up `tenant_domains` by hostname, sets `x-tenant-*` headers.
- Server components read tenant context via `getTenantContext()` from `lib/tenant.ts` — reads those headers, no DB query.

## Domain logic

- Pure business logic lives in `lib/domain/` — no DB calls inside those files.
- `lib/search.ts` is the signal-assembly layer between Supabase queries and `lib/domain/ranking.ts`.

## Applying the migration

```bash
# Link to your Supabase project first:
supabase link --project-ref <your-project-ref>

# Push the migration:
supabase db push

# Generate types (replace lib/db.ts stubs):
supabase gen types typescript --linked > lib/db.ts
```
