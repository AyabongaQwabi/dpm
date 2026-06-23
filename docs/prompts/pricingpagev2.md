# Public pricing page — build prompt (complete version)

This supersedes any earlier pricing-page prompt. The version of this prompt
written before the discount-unlock bonus and price-change moderation system
existed is now incomplete — it covers the subscription and commission
brackets correctly but says nothing about ceiling packages, the
discount-unlock bonus, or how price changes are moderated. This version
covers the full system.

## Purpose and placement

A public, no-login-required pricing page a prospective provider can read
before signing up. Linked from the navbar/footer and from sign-up entry
points. Source of truth for every number and rule on this page:
`dpm_pricing_model_source_of_truth.docx`.

## What "beautiful and informational" means here specifically

This page has to do two jobs that are normally in tension: be genuinely
inviting and well-designed (per this project's established South African
landscape/craft visual direction — warm, human typography, the per-vertical
theming system already built), while also being completely accurate about a
pricing mechanism with real nuance (per-sale brackets, optional ceilings, a
conditional discount bonus, and price-change moderation). Don't let the
"beautiful" half push the page toward vague, marketing-soft language that
papers over how the mechanism actually works — a provider who signs up
expecting something different from what they read here is the worst outcome
this page could produce. Precision and warmth are both required, not a
tradeoff between them.

## Page sections

### 1. Hero / plain-language summary
A short, honest explanation before any tables: "You pay R99/month to be
listed. When you make a sale, we take a small commission — between 7.5% and
12.75% depending on the price of what you sold. If you regularly sell
higher-priced services, you can add an optional package that caps your
maximum rate, and get an extra discount on top when you run real promotions
for your customers." This should read warmly but must not soften or omit
the per-sale mechanism — a visitor must come away understanding this is not
a flat monthly rate.

### 2. The commission bracket table
The 5-bracket table (R0–999 at 7.5%, up through R50,000+ at 12.75%), with
the worked example (a R500 sale and a R23,000 sale in the same month are two
independent calculations, not blended) shown inline so the per-sale
mechanism is unambiguous on first read.

### 3. Interactive commission calculator
A real-time calculator: the visitor enters a service price, the page shows
which bracket it falls into and the resulting commission and net payout,
recalculating live. Extend it to show the effect of each ceiling package on
that same price (see Section 5 below), so a visitor entering R48,500
immediately sees what they'd pay standard versus on each package — this
removes the need for the visitor to do bracket math by hand and is the
single most useful element on the page.

### 4. Ceiling packages section
The four-package table (R499/R799/R1,199/R1,699, capping at 10%/9.5%/8.5%/
7.5% respectively), explaining plainly what standard rates each one protects
against. State clearly that the base R99 subscription with no ceiling is a
completely normal default, expected to be what most providers choose — don't
present the ceiling packages as something every provider should feel
pressure to add. This section should make clear a ceiling can only ever help
or do nothing on a given sale, never cost more than standard would.

### 5. Discount-unlock bonus section — new, not in earlier drafts of this page
Explain that providers on a ceiling package can unlock an additional rate
reduction by giving customers a genuine 10% discount on a service:

| Package | Ceiling | Discount bonus | Rate once unlocked |
|---|---|---|---|
| 10% ceiling | 10.0% | −2.5pts | 7.5% |
| 9.5% ceiling | 9.5% | −3.0pts | 6.5% |
| 8.5% ceiling | 8.5% | −3.5pts | 5.0% |
| 7.5% ceiling | 7.5% | −4.5pts | 3.0% |

Be precise that the discount must be exactly 10% (not "at least" 10%) to
qualify, and that this bonus is only available to providers already on a
ceiling package — not the base subscription. Use the worked example from the
source document (a R999 service, 10% off, on the 7.5% ceiling package: R67.43
standard commission drops to R26.97 with the bonus unlocked).

Do NOT explain the anti-gaming verification mechanics (prior-sale matching,
the 5% qualifying band, demand thresholds) in detail on this public page —
that's internal integrity logic, not something a prospective provider needs
to read before signing up. It's fine, and arguably reassuring, to mention in
one line that the bonus requires "a genuine sales history at that price" so
it doesn't read as an unconditional, instantly-available perk — but don't
turn this into a compliance document. The full mechanics belong in
provider-dashboard help content once they're an active user, not on the
public marketing page.

### 6. Price-change fairness note — new, not in earlier drafts of this page
A short, plainly-worded section (not a full table of bands and percentages —
that level of detail belongs in dashboard help content, not the public page)
reassuring prospective providers that the platform monitors pricing changes
to keep the marketplace trustworthy for customers, and that legitimate price
increases — including ones driven by real demand — are handled fairly. The
goal of this section is reassurance and transparency about there being a
system, not a full disclosure of every threshold. Suggested framing: "We keep
an eye on big, sudden price changes to protect customer trust in the
platform — if you're raising prices because demand for your service is
genuinely high, that's recognized, not penalized."

### 7. FAQ / clarifications
- "Do I pay commission on every sale, or is there a monthly total?" → per
  sale, independently, not accumulated.
- "What if I'm on a ceiling package — do I still get the lower rate on my
  cheap sales?" → yes, ceilings never increase what you'd pay versus
  standard, only ever cap the higher brackets.
- "How do I unlock the discount bonus?" → be on a ceiling package, offer a
  genuine 10% discount on a service with real sales history at its current
  price. Link to dashboard help content for the full mechanics once a
  provider is signed in, rather than explaining it fully here.
- "Can I change or cancel a ceiling package?" → state the actual policy once
  decided — not specified in the source document yet, flag to the person
  rather than invent an answer.
- "Is there a free trial, or is the R99 charged immediately?" → state the
  actual policy once decided — also not specified yet, flag rather than
  invent.

## Technical notes

- Public, no authentication required.
- Implement the bracket, ceiling, and discount-bonus calculation logic by
  importing the actual shared functions from `lib/domain/payments.ts` (per
  the separate pricing-logic implementation prompt) — do not reimplement or
  approximate the math separately on this page. The calculator must use the
  real, tested calculation functions, not a simplified copy that could drift
  out of sync with the actual backend logic.
- Do not surface the anti-gaming/price-moderation thresholds (the 5%/9.5%/
  25%/50% bands) anywhere on this public page — per Section 6 above, this
  page gets a reassuring summary, not the implementation detail.
- Follow the project's established design direction (South African
  landscape/craft palette, warm/human typography, the per-vertical theming
  system) — this is a marketing-adjacent page, not a dashboard screen.

## Explicitly flagged as unresolved — do not invent answers

Two FAQ items reference policies not yet decided: whether ceiling packages
can be cancelled/changed and on what notice, and whether there's a free
trial before the first R99 charge. Surface these to the person directly
rather than guessing reasonable-sounding defaults.
