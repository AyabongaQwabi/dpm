# Public pricing page — build prompt for Claude Code

## Purpose and placement

Build a public, no-login-required pricing page that a prospective provider can
read before signing up — linked from the navbar/footer and from the "Get
listed" / sign-up entry points already in the app. This page explains exactly
what a provider will pay, with no surprises after they commit. Source of truth
for all numbers: `servicepros_provider_pricing_model.docx` (the confirmed
structure section, specifically Section 2).

## The pricing model this page must explain correctly

**This is the part most likely to be gotten wrong if paraphrased loosely —
implement it exactly as described, not as a simplified summary:**

1. **Subscription**: R99/month, every provider, no exceptions, before any
   commission applies.

2. **Commission applies per individual sale**, not as a marginal scale across
   a provider's monthly total. Each sale's own price determines which bracket
   it falls into, and that bracket's rate applies to the *entire* sale:

   | Bracket | Service price range | Standard commission rate |
   |---|---|---|
   | 1 | R0 – R999 | 7.5% |
   | 2 | R1,000 – R4,999 | 8.5% |
   | 3 | R5,000 – R9,999 | 9.5% |
   | 4 | R10,000 – R49,999 | 10.0% |
   | 5 | R50,000 and above | 12.75% |

   Example to render correctly: a provider selling one R500 service and one
   R23,000 service in the same month pays 7.5% on the R500 sale and 10% on
   the R23,000 sale — two independent calculations, not a blended monthly
   rate.

3. **Optional rate-ceiling packages** — a provider may additionally subscribe
   to a package that caps the maximum rate they'll ever pay on any single
   sale, regardless of which bracket that sale would otherwise fall into.
   The package does NOT replace the bracket schedule — for every sale, the
   provider pays whichever is LOWER: the standard bracket rate for that
   sale's price, or their package's ceiling rate.

   | Package | Ceiling rate | Monthly fee |
   |---|---|---|
   | 10% ceiling | 10.0% | R 499 |
   | 9.5% ceiling | 9.5% | R 799 |
   | 8.5% ceiling | 8.5% | R 1,199 |
   | 7.5% ceiling | 7.5% | R 1,699 |

   Critical correctness point: a ceiling can only ever help or do nothing on
   any given sale — it must never be presented or calculated in a way that
   makes a sale cost MORE than the standard bracket would. A provider on the
   8.5% ceiling still pays the ordinary 7.5%/8.5% standard rates on sales in
   brackets 1 and 2; the ceiling only takes effect on sales that would
   otherwise have landed in a bracket above the cap.

## Page sections

### 1. Hero / plain-language summary
A short, honest explanation at the top, before any tables: "You pay R99/month
to be listed. When you make a sale, we take a small commission — between
7.5% and 12.75% depending on the price of what you sold. If you regularly
sell higher-priced services, you can cap how much commission you'll ever pay
with an optional add-on." Avoid burying the real mechanism under marketing
language — providers need to understand this correctly before signing up,
not just feel reassured by it.

### 2. The bracket table
Render the 5-bracket table above clearly, with the worked example (R500 sale
→ R37.50, R23,000 sale → R2,300) shown inline so the per-sale (not
per-month) mechanism is unambiguous on first read.

### 3. Interactive commission calculator
A simple, real-time calculator: the visitor enters a service price, and the
page shows which bracket it falls into and the resulting commission amount
and net payout, recalculating live as they type. This is the single most
useful thing on the page for a hesitant prospective provider — let them plug
in their own real service price and see the actual number, rather than
making them do the math themselves from a static table.

Extend the calculator to also show the effect of each ceiling package on
that same price, so a visitor entering, say, R48,500 can immediately see:
"Standard: R4,850 commission. With the 8.5% ceiling: R4,122.50 commission."
This directly answers "is a package worth it for me" without requiring the
visitor to do bracket math by hand.

### 4. Ceiling packages section
Render the 4-package table above. For each package, state plainly what
standard rates it protects against (e.g. "the 9.5% ceiling protects you from
ever paying the 10% or 12.75% bracket rates"). Make clear these are optional
and that the base R99 subscription with no ceiling is a completely normal,
default choice — most providers are expected to fall into this group. Don't
present the ceiling packages as something every provider should feel
pressured to add.

### 5. FAQ / clarifications
Anticipate and answer the most likely points of confusion directly:
- "Do I pay commission on every sale, or is there a monthly total?" → per
  sale, independently, not accumulated.
- "What if I'm on a ceiling package — do I still get the lower rate on my
  cheap sales?" → yes, ceilings never increase what you'd pay versus
  standard, only ever cap the higher brackets.
- "Can I change or cancel a ceiling package?" → state the actual policy once
  decided (not specified in the source document — flag this to the person
  rather than inventing an answer).
- "Is there a free trial or is the R99 charged immediately?" → state the
  actual policy once decided (also not specified in the source document —
  flag rather than invent).

## Technical notes

- This page must be accessible without authentication — it's explicitly
  meant to be seen before sign-up.
- Implement the bracket and ceiling calculation logic as a shared,
  reusable function (not duplicated between the calculator and any other
  place commission is calculated in the app) — this logic already exists or
  will need to exist in `lib/domain/payments.ts` per the business logic
  specification; reuse it here rather than reimplementing the math
  separately on the pricing page.
- All Rand amounts should be formatted consistently with the rest of the
  site (thousands separators, two decimal places where relevant).
- Follow the existing design direction already established for this project
  (South African landscape/craft palette, the per-vertical theming system,
  warm/human typography) — this is a marketing-adjacent page, not a
  dashboard, so it should feel like the rest of the public site, not like an
  internal admin screen.

## Explicitly flagged as unresolved — do not invent answers

Two FAQ items above reference policies not yet decided: whether ceiling
packages can be cancelled/changed and on what notice, and whether there's a
free trial period before the R99 subscription is first charged. Surface
these to the person directly rather than guessing reasonable-sounding
defaults — getting either wrong on a public pricing page is the kind of
mistake that's expensive to walk back once providers have seen it.
