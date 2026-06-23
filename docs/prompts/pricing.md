# Implement pricing, discount-unlock, and price-change moderation — prompt for Claude Code

Read `dpm_pricing_model_source_of_truth.docx` in full before writing any code
— it is the single source of truth for everything in this prompt, including
several corrections to earlier, incorrect models of this system (commission
is per-sale, not a monthly marginal scale; ceiling packages cap the rate,
they don't replace it). If anything elsewhere in the codebase reflects an
older model, that code is wrong and should be corrected to match this
document, not the other way around.

## 1. Commission calculation (Section 1-2 of the source doc)

Implement as a pure, testable function in `lib/domain/payments.ts` (extending
whatever commission logic already exists there per the business logic
specification):

- A flat R99/month subscription applies to every provider, no exceptions.
- Commission is calculated per individual sale, based on that sale's own
  final (post-discount) price, using the 5-bracket table in the source doc
  Section 2. This is NOT a marginal/cumulative calculation across a
  provider's monthly sales — each sale is independently evaluated.
- All bracket boundaries, the subscription fee, and all rates must be read
  from configuration (e.g. `platform_config`), never hardcoded — consistent
  with how other business-tunable values are already handled in this
  project.

Write unit tests covering the five verified worked examples from the source
document Section 2 (R500→R37.50, R3,500→R297.50, R6,300→R598.50,
R48,500→R4,850, R74,300→R9,473.25) before moving on.

## 2. Rate ceiling packages (Section 3)

- Four optional package subscriptions (R499/R799/R1,199/R1,699 per month),
  each with a corresponding ceiling rate (10%/9.5%/8.5%/7.5%).
- For any sale, the effective commission rate is
  min(standard_bracket_rate_for_this_sale, providers_ceiling_rate_if_any).
  A provider with no package simply uses the standard bracket rate.
- This must never produce a rate HIGHER than the standard bracket would —
  write a test asserting this property holds across a wide range of sale
  prices and all four package ceilings (a ceiling can only help or do
  nothing, never hurt).

## 3. Discount-unlock bonus (Section 4)

- Only available to providers on one of the four ceiling packages — no bonus
  applies to the base R99-only subscription.
- Only triggers when a service's discount is set to EXACTLY 10% (not "10% or
  more" — discounts above 10% earn no additional bonus, discounts below 10%
  earn none at all).
- Bonus amounts (subtracted from the package's ceiling rate, not from the
  commission amount directly): 10% ceiling minus 2.5pts, 9.5% ceiling minus
  3.0pts, 8.5% ceiling minus 3.5pts, 7.5% ceiling minus 4.5pts.
- The bonus is gated entirely by the verification rule in Section 4 below —
  do not implement the 10%-discount check in isolation without it.

## 4. Anti-gaming verification — implement this precisely, not approximately

This is the part of the system most likely to be subtly broken if
paraphrased loosely. Read source doc Section 5 in full, specifically
PRICE-LOGIC-001 through PRICE-LOGIC-007.

**The critical distinction**: eligibility depends on the service having a
prior sale (a completed, paid transaction) within 5% below the current list
price — not a prior listing at that price. A provider editing their price
multiple times without any real sale in between must never accumulate
eligibility. If you find yourself implementing this by checking the
service's price-edit history rather than its sales/bookings history, stop —
that is the wrong table and reopens the exact loophole this rule exists to
close.

Implement the price-change band logic as its own function, taking the
service's last sale price and current list price, returning eligibility,
flag status, and review-hold status. Five bands, verified boundaries (use
these exact test cases as unit tests):

| Increase since last sale | Discount eligible | Flagged | Status |
|---|---|---|---|
| Up to 5.0% | Yes | No | Live |
| 5.0001% to 9.4999% | No | No | Live |
| 9.5% to 24.9999% | No | Only if demand NOT met | Live, support chat if flagged |
| 25% to 49.9999% | No | Always | Live, flagged |
| 50% or more | No | Always | OLD PRICE STAYS LIVE, new price held pending review |

- "High demand" = 3 or more completed sales within the same 5%-band used for
  eligibility. This exemption applies ONLY in the 9.5 to 24.9999% band — it
  has no effect in the 25%+ or 50%+ bands, which flag/hold unconditionally
  regardless of demand. Do not let the demand check leak into those bands.
- A service with no prior sale at all is simply not eligible — not flagged,
  not suspicious, just not yet earned eligibility.
- At 50%+, the previous price must remain what customers actually see and
  can book — the new price is stored in a pending state, not applied to the
  live, customer-facing record, until approved. This needs an actual
  pending/review state on the service or service-package record, not just a
  flag.

Write unit tests for every boundary value in the table above (test at
exactly 5.0%, 5.0001%, 9.4999%, 9.5%, 24.9999%, 25%, 49.9999%, 50%, both
with and without high demand where relevant) before considering this
feature complete.

## 5. Notification flow (Section 5.6)

- Runs asynchronously after a provider saves a price/discount edit — must
  not block or delay the save itself.
- If both discount-eligibility conditions are met (qualifying prior sale AND
  exactly 10% discount, regardless of which was set first), notify the
  provider and require them to actively opt in before the bonus applies —
  never apply it silently.
- If the price-change band requires flagging, trigger a support-chat message
  asking whether the increase was intentional — independent of whatever the
  discount-eligibility outcome was; a single price edit can trigger both a
  flag and (separately) no discount eligibility, or either alone, depending
  on the specific numbers.
- At the 50%+ band, additionally notify the provider that their new price is
  on hold and customers will keep seeing the old price until review
  concludes.

## 6. What's explicitly out of scope for this prompt

The actual review/approval workflow for a 50%+ held price change (who
reviews it, how it's approved or rejected, what the provider sees while
waiting) is NOT specified in the source document — only the held state is
specified. Implement the state and the hold correctly, but stop and ask
before inventing an approval workflow, since none has been decided yet.

## 7. Migrations and seed data

This adds real schema surface: package subscriptions, discount-bonus state
per service, sale price history (needed for the 5% qualifying-band checks),
and a pending-review state for held price changes. Write proper migrations
following this project's existing Supabase migration convention. Update or
extend the seed script so seeded services have enough sale history to
exercise all five price-change bands and both demand states in any manual
testing/preview — don't leave this system impossible to visually verify
because seed data has no sales history to check eligibility against.

## 8. Test coverage — comprehensive, not just the spot checks above

This system handles real money and has already had two incorrect mental
models corrected during design (commission as a monthly marginal scale, and
ceiling packages as flat-rate replacements) before landing on the version in
the source document — that history is itself a reason to treat test
coverage here as load-bearing, not optional polish. Beyond the specific unit
tests already called out in Sections 1, 2, and 4 above, write:

- **Property-based / exhaustive boundary tests** for the commission bracket
  function across the full price range (R0 to well past R50,000), asserting
  the correct bracket is selected at every boundary (R999/R1,000,
  R4,999/R5,000, R9,999/R10,000, R49,999/R50,000).
- **Property-based tests for the ceiling function** asserting, for a wide
  random sample of (price, ceiling) pairs, that the result is never greater
  than the standard bracket rate would have been — this is the single most
  important invariant in the whole system and should be tested as a
  property, not just a handful of examples.
- **Every boundary row in the price-change moderation table** (Section 4 of
  this prompt) as an explicit test case, including the demand-met and
  demand-not-met variants where relevant, and including at least one test
  per band confirming the discount-eligibility, flagged, and review-hold
  outputs are all independently correct (not just that one of the three is
  right).
- **An explicit regression test reproducing the gaming scenario** from the
  source document's Section 5.1 (inflate list price, apply exactly 10%
  discount, no genuine prior sale at the inflated price) and asserting the
  discount bonus is correctly NOT granted. This test exists specifically so
  that if anyone ever "simplifies" the verification logic later, this test
  fails loudly rather than the regression going unnoticed.
- **An integration test for the full notification flow** (edit triggers the
  async check, correct notification fires for each outcome combination),
  not just the pure calculation functions in isolation.

## 9. CI gate — no build reaches production if these tests fail

This project already has Vitest configured (`npm test` runs `vitest run`)
and is hosted on Vercel per the tech stack specification. Wire this up as a
real, enforced gate, not just a script someone has to remember to run:

- Add a GitHub Actions workflow (`.github/workflows/test.yml`) that runs on
  every push and every pull request: install dependencies, run `npm run
  lint`, then run `npm test`. The workflow must fail (non-zero exit) if
  either step fails.
- Configure the repository's branch protection on `main` (or whichever
  branch triggers production deploys) to require this workflow to pass
  before a PR can be merged — this is a GitHub repository setting, not
  something expressible purely in code, so flag this to the person as a
  manual step they need to enable in GitHub's settings if Claude Code
  doesn't have the access to configure it directly.
- Separately, configure Vercel's own build step to also run `npm test`
  before `next build` (e.g. via a custom build command, or a `prebuild`
  script in package.json) so that even a deploy triggered outside the normal
  GitHub PR flow (e.g. a direct push, or a manual redeploy) still can't
  produce a live deployment if tests are failing — this is the actual
  "no build must be deployed to production if these tests fail" guarantee,
  since the GitHub Actions gate alone only protects the merge step, not
  every possible path to a Vercel deployment.
- Tell the person explicitly, after this is wired up, exactly which manual
  steps (if any) they still need to complete in the GitHub or Vercel
  dashboard themselves — branch protection rules and certain Vercel project
  settings typically cannot be configured purely through committed code.
