# The DPM engine — UI design direction (insert into build prompt)

## Brief

Design like the lead at a small studio known for never reusing a look. This client
has already seen and rejected templated directory/marketplace UI — generic
white-card-on-gray-background SaaS, a giant search bar over a stock photo of people
smiling in business attire, pill-shaped badges everywhere, numbered "01 / 02 / 03
how it works" sections with no real sequence behind them. None of that. Take one
real aesthetic risk per page and be able to justify it.

Explicitly avoid the three looks AI-generated design currently clusters around,
regardless of how good they look in isolation: (1) warm cream background with a
high-contrast serif and a terracotta accent, (2) near-black background with a
single acid-green or vermilion accent, (3) broadsheet-style hairline rules with
zero border-radius and dense newspaper columns. If a page's design is starting to
resemble any of these, stop and revise before building it out.

## The actual subject, not a generic marketplace

ServicePros is not "a directory app." It's the online front door for real South African
trade businesses — a wedding caterer, a security company, a cleaning crew, a legal
firm — who currently either have no real web presence or a generic one. The
emotional stakes are real: independent operators losing ground to faceless,
AI-generated sameness. The design's whole job is to be the opposite of that: feel
specific, human-made, and premium, the way a well-kept physical shopfront or a
properly hand-lettered sign feels trustworthy at a glance.

Ground every design decision in **signage and trade-craft**, not generic SaaS
UI conventions: think hand-painted shop signs, brass plates outside a legal office,
a chalkboard menu outside a caterer's kitchen, reflective lettering on a security
van, a laundromat's clean tile-and-steel palette. These are real, distinct visual
languages that already exist per trade in South Africa — the design should feel
like it's drawing from them, not from Dribbble's idea of a "marketplace platform."

## The signature element

A fixed "shopfront frame" used consistently across every provider card and profile
header: a deliberate, slightly heavier-than-default border or panel treatment
(not a thin hairline) around the provider's primary image/icon, with **the same
geometry on every card regardless of vertical** — same corner treatment, same
border weight, same internal proportions. Only the color and any iconography
inside that frame change per vertical/trade.

This is the single memorable thing the UI is built around: the frame's *shape*
signals "this is a trustworthy system," while its *color and content* signal
"this specific kind of trade." Don't dilute this by introducing a second competing
signature element elsewhere on the page — keep the boldness spent here.

## Color: per-vertical, not one fixed palette

Because the DPM engine is genuinely multi-vertical, do not design one fixed brand palette and
apply a single accent-color swap per tenant — that produces the generic "same
template, different accent" feeling the client has explicitly rejected. Instead,
design 4-6 small, deliberate per-trade palettes, each named for what it evokes
(not generic names like "primary/secondary"), each with its own light and dark
mode pairing:

- Events/catering: warm, kitchen-and-celebration toned
- Security: steel, reflective, slightly cooler and more authoritative
- Cleaning: fresh, clean, slightly cooler-bright
- Legal/compliance: brass-and-stone, restrained, gravitas over brightness

Each palette should feel like it belongs to its trade specifically, not like a hue
rotation of the same base color. Light and dark mode are not just inverted
versions of each other — treat each as its own considered pass per palette, and
make sure body text, borders, and interactive states all hold proper contrast in
both.

## Typography

Pair a characterful display face with real presence — something with the weight
and confidence of signage or a brass plate, used with restraint — against a plain,
highly legible body face that gets out of the way. Avoid reaching for the same
typefaces that would show up on any other generic SaaS or marketplace brief.
Consider a third, monospace or slab utility face for structured data specifically
(prices, hours, addresses, booking details) — giving those moments a receipt-like,
precise feel that reinforces trust in the transactional parts of the experience.

## Structure and motion

Structural devices (dividers, labels, eyebrows, numbering) must encode something
real about the content, not decorate it — e.g. only use a numbered sequence where
there's an actual sequence (a booking flow's real steps), never as a default
section-break device. Use motion deliberately and sparingly: a considered
page-load or scroll-triggered reveal for the hero is worth doing well; avoid
scattering hover/transition effects everywhere, which reads as templated rather
than premium. Respect reduced-motion preferences.

## Premium, specifically

"Premium" here means: generous whitespace used with intent (not just padding
everywhere), restraint in how many accent colors/effects appear on a single
screen, real photography-quality imagery treated consistently (consistent crop
ratios, consistent treatment across providers so the grid feels curated rather
than thrown together), and typography doing the work instead of decoration. Avoid
anything that reads as "AI built this fast" — drop shadows stacked for no reason,
gradient backgrounds without purpose, generic rounded-pill badges on every small
piece of metadata, emoji used as icons.

## Before building

Work through a brief design plan first — a compact token system: 4-6 named colors
per vertical palette (not generic primary/secondary labels), the type pairing and
roles, a one-paragraph layout concept per major page, and a one-line description
of the signature element's exact geometry. Review that plan specifically against
the "would this look the same for any other marketplace brief" test before writing
any code — if a piece of it would, revise it and say what changed and why. Only
then implement, following the reviewed plan exactly.

Build to a quality floor without announcing it: fully responsive down to mobile,
visible keyboard focus states, and reduced-motion respected throughout.
