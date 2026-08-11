# Claude Code prompt — Feature request page

**Repo:** `/Users/nonwork/dev/servicepros/dpm`
**Scope:** one self-contained feature. Public page where anyone can submit a feature request. Saves to Supabase, emails Aya, confirms to the submitter.
**Out of scope:** public voting, public roadmap, admin UI. These are v2 and must not be built here.

---

## Step 0 — Read before writing anything

Do not write a single line until you have read the actual codebase and reported what you found. Do not assume any convention below exists; find the real one.

Read and summarise:

1. **Migrations** — where Supabase migrations live, their naming convention, and how existing tables declare enums (native Postgres enums vs text + check constraint). Match whatever is already there.
2. **RLS patterns** — find two or three existing tables with RLS enabled and copy their policy style exactly, including how the service role is referenced.
3. **Forms** — find an existing public-facing form (contact page is the likely candidate). Note whether it uses server actions or route handlers, how validation is done (zod? something else?), how errors surface to the user, and what the success state looks like.
4. **Email** — find every existing call to Resend. Note the `from` address(es) in use, whether there is a shared email-sending helper, and whether email templates are React Email, plain HTML strings, or something else. Do not invent a new pattern if one exists.
5. **Anti-spam** — check whether the repo already has rate limiting, a honeypot pattern, or Turnstile/hCaptcha wired up anywhere. If it does, reuse it. If it does not, use the honeypot + Supabase-side rate limit described below and flag that no captcha exists.
6. **Page shell** — the layout components, container widths, heading styles and metadata helper used by an existing static page such as `/how-it-works` or `/verification`.
7. **Footer** — the exact structure of the footer link groups (Discover / For providers / Company).

Report all seven findings before proceeding. If any of them contradicts an instruction below, follow the repo and tell me.

---

## Step 1 — Migration

Create one migration adding a `feature_requests` table.

Columns:

| column | type | notes |
|---|---|---|
| `id` | uuid | primary key, default `gen_random_uuid()` |
| `created_at` | timestamptz | default `now()`, not null |
| `user_id` | uuid | nullable, FK to auth.users, `on delete set null` — anonymous submissions are allowed |
| `name` | text | not null |
| `email` | text | not null |
| `submitter_role` | enum | `customer`, `provider`, `agent`, `other` — not null |
| `area` | enum | `search`, `profile`, `payments`, `messaging`, `reviews`, `mobile`, `other` — not null |
| `title` | text | not null |
| `description` | text | not null |
| `status` | enum | `new`, `triaged`, `planned`, `in_progress`, `shipped`, `declined` — not null, default `new` |
| `admin_notes` | text | nullable, for the future admin platform |
| `vote_count` | integer | not null, default 0 — reserved for v2, nothing writes to it yet |
| `source_path` | text | nullable, the page the user came from |
| `user_agent` | text | nullable |
| `ip_hash` | text | nullable |

Indexes on `status`, `created_at desc`, and `ip_hash`.

**POPIA requirements — these are not optional:**

- Never store a raw IP address. Hash it server-side with a salt read from an environment variable. Add the new env var to `.env.example` and tell me it needs setting in Vercel.
- Length caps enforced at the database level as well as in the form: `title` 120 chars, `description` 2000 chars, `name` 100, `email` 254.

**RLS:**

- Enable RLS on the table.
- Insert policy: allow `anon` and `authenticated`.
- Select / update / delete: service role only. No client-side read path exists yet.

---

## Step 2 — The page

Route: `/feature-requests`. If the repo's routing conventions suggest a better home, tell me before creating it rather than picking one silently.

Content, in the site's existing voice — plain, direct, South African, no corporate filler:

- A short heading and one paragraph explaining what this page is for and what happens after you submit (a real person reads it; you may get a reply; not everything gets built).
- The form: name, email, "are you a…" (submitter_role), "which part of ServicePros" (area), a one-line title, and a description textarea with a visible character counter.
- A hidden honeypot field. Any submission with it filled is silently accepted by the UI and discarded server-side — do not show an error, do not insert the row.
- Clear inline validation and a success state that does not navigate away.

Metadata: title, description, canonical, and OG tags following the exact pattern used by `/verification`. `robots: index, follow`.

Add a footer link under **Company** or **Help centre** — whichever group the existing structure makes more natural. Tell me which you chose.

---

## Step 3 — Submission handling

Server-side, in whatever pattern Step 0 found (server action or route handler — do not introduce a second pattern):

1. Validate. Reject anything failing the length caps or a basic email shape check.
2. Rate limit: reject if the same `ip_hash` has inserted more than 3 rows in the last hour. Return a friendly message, not a raw error.
3. Insert the row. Capture `source_path`, `user_agent`, `ip_hash`, and `user_id` if a session exists.
4. Send two emails via Resend.

**Email A — to Aya:**

- To: `aya@qwabi.co.za`
- From: a `@servicepros.co.za` address on the already-verified Resend sending domain. **Do not send from `@qwabi.co.za`** — it is a different domain and will not be verified in Resend. If no suitable verified sender exists in the repo, stop and tell me rather than guessing.
- Reply-To: the submitter's email, so replying from the inbox goes straight to them.
- Subject: `New feature request — {title}`
- Body: every field, plus the row id, plus the submitting user's id if present.

**Email B — to the submitter:** a short confirmation restating their request. Same sender, no reply-to override.

Email failure must never lose the request. Insert first, then send. If sending throws, log it and still return success to the user.

---

## Step 4 — Tests

Vitest, matching existing test conventions:

- Valid submission inserts a row and returns success.
- Honeypot filled → no row inserted, UI still shows success.
- Over-length title or description → rejected.
- Fourth submission from the same `ip_hash` within an hour → rejected.
- Email throwing → row still exists, user still sees success.

---

## Acceptance criteria

- [ ] Migration applies cleanly and rolls back cleanly.
- [ ] RLS verified: an anon client can insert but cannot select.
- [ ] No raw IP stored anywhere, including logs.
- [ ] Page renders correctly on mobile at 375px.
- [ ] Both emails send in a local test.
- [ ] Footer link present.
- [ ] All tests pass, typecheck passes, lint passes.

## Rules

- Read the codebase before writing. No invented facts, no invented conventions.
- No new dependencies without asking first.
- Any copy that makes a promise about response times or what will be built stays vague — do not commit ServicePros to an SLA.
- Do not build voting, the roadmap, or the admin view. Stop and say so if the work starts drifting there.