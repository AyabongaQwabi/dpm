# Prompt: Implement the ServicePros SEO Workbench

You are working in the ServicePros DPM repo:

```txt
/Users/nonwork/dev/qwabi-biz/servicepros/dpm
```

Your job is to implement the SEO strategy in `docs/seo/` across the application. This is expected to take multiple runs. Do not try to do everything in one pass if the change becomes large or risky. Work in small, verifiable batches and keep the progress tracker updated every run.

## Source Documents

Read these files before changing code:

- `docs/seo/SEO-WORKBENCH-INDEX.md`
- `docs/seo/SEO-AUDIT-AND-PLAN.md`
- `docs/seo/TECHNICAL-SEO-DEEP-DIVE.md`
- `docs/seo/PROGRAMMATIC-SEO-GOVERNANCE.md`
- `docs/seo/INFORMATION-ARCHITECTURE-BLUEPRINT.md`
- `docs/seo/SCHEMA-REPORT.md`
- `docs/seo/META-OPTIMIZATION.md`
- `docs/seo/SNIPPET-OPPORTUNITIES.md`
- `docs/seo/KEYWORD-STRATEGY.md`
- `docs/seo/CONTENT-QUALITY-AUDIT.md`
- `docs/seo/AUTHORITY-BUILDING.md`
- `docs/seo/SEO-IMAGE-ASSET-PLAN.md`
- `docs/seo/AI-CITATION-PROVIDER-VISIBILITY.md`
- `docs/seo/COMPARISON-PAGES-SAFE-STRATEGY.md`
- `docs/seo/IMPLEMENTATION-TRACKER.md`

## Progress Tracking Rules

`docs/seo/IMPLEMENTATION-TRACKER.md` is mandatory.

At the start of every run:

1. Read `docs/seo/IMPLEMENTATION-TRACKER.md`.
2. Read the relevant source docs for the next pending task.
3. Inspect the current code before editing; do not assume prior runs completed correctly.
4. If the tracker and code disagree, trust the code and update the tracker.

During every run:

1. Mark the active task as `In progress`.
2. Implement a small coherent batch.
3. Run the narrowest useful validation.
4. Mark completed tasks as `Done` only after verification.
5. Mark tasks as `Blocked` only with a concrete reason and next decision needed.
6. Add notes with files changed, commands run, and any follow-up risk.

At the end of every run:

1. Update the tracker summary.
2. Leave the repo in a coherent state.
3. Report exactly what was implemented, what was verified, and what remains.

## Implementation Order

Follow this order unless code inspection reveals a dependency that should move earlier.

### Phase 1: Technical Foundation

Implement from:

- `TECHNICAL-SEO-DEEP-DIVE.md`
- `SEO-AUDIT-AND-PLAN.md`
- `PROGRAMMATIC-SEO-GOVERNANCE.md`

Tasks:

1. Expand `app/sitemap.ts` to include all confirmed indexable public routes:
   - `/dpm`
   - `/how-it-works`
   - `/why-servicepros`
   - `/verification`
   - `/help`
   - `/contact`
   - `/platform-partners`
   - `/referral-agents`
   - `/providers/top-rated/[location]`
   - `/providers/service/[slug]`
   - `/services/[id]`
   - qualified `/providers/category/[slug]/in/[location]`
2. Fix pagination canonical strategy:
   - Use self-referencing canonicals for page 2+ if paginated pages should be indexable.
   - Or use `noindex,follow` for page 2+ if the strategy is to concentrate ranking on page 1.
   - Apply consistently across category, location, category-location, top-rated, service-type, search, and services pages.
3. Control filter indexation:
   - Keep clean landing routes indexable.
   - Noindex arbitrary query/filter/sort/min/max URLs unless they map to a clean SEO route.
4. Consider CSP report-only after auditing third-party browser needs. Do not enforce CSP until it has been tested.

Validation:

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

If full build is too slow or blocked, run targeted lint/type checks and document the limitation.

### Phase 2: Schema Implementation

Implement from:

- `SCHEMA-REPORT.md`
- `INFORMATION-ARCHITECTURE-BLUEPRINT.md`
- `SEO-IMAGE-ASSET-PLAN.md`

Tasks:

1. Add reusable schema helpers to `lib/seo.ts`:
   - `breadcrumbJsonLd`
   - `serviceJsonLd`
   - `offerCatalogJsonLd`
   - `webSiteJsonLd`
   - optional `imageObjectJsonLd`
2. Emit `WebSite` SearchAction on the homepage.
3. Emit `BreadcrumbList` on indexable public SEO pages.
4. Emit `Service` and `Offer` schema on `/services/[id]`.
5. Emit `OfferCatalog` on `/pricing`.
6. Emit `ItemList` on `/providers/top-rated/[location]` and `/providers/service/[slug]`.
7. Enrich `Organization` and `LocalBusiness` only with confirmed data that exists in code or content.

Rules:

- Do not invent ratings, addresses, phone numbers, reviews, awards, certifications, or social links.
- Structured data must reflect visible page content.
- Prefer JSON-LD through `components/seo/JsonLd.tsx`.

Validation:

```bash
npm run lint
npx tsc --noEmit --pretty false
```

Manual post-deploy validation:

- Google Rich Results Test
- Schema Markup Validator

### Phase 3: Metadata and Page Structure

Implement from:

- `META-OPTIMIZATION.md`
- `INFORMATION-ARCHITECTURE-BLUEPRINT.md`
- `SNIPPET-OPPORTUNITIES.md`
- `KEYWORD-STRATEGY.md`
- `CONTENT-QUALITY-AUDIT.md`

Tasks:

1. Update route-level metadata to the recommended patterns.
2. Ensure each public page has exactly one H1.
3. Add or tune H2/H3 structure to match the blueprint.
4. Add snippet-ready answer blocks to:
   - `/dpm`
   - `/how-it-works`
   - `/pricing`
   - `/verification`
   - `/get-listed`
   - `/platform-partners`
5. Add jump links only on longer explainer pages.
6. Improve `/services/[id]` metadata with provider, city, package, price, and image context when available.

Rules:

- Do not add generic SEO fluff.
- Keep visible copy accurate to the current product.
- Use `ServicePros` consistently in public copy unless a file intentionally uses another brand form.

Validation:

```bash
npm run lint
npx tsc --noEmit --pretty false
```

### Phase 4: Programmatic SEO Quality Gates

Implement from:

- `PROGRAMMATIC-SEO-GOVERNANCE.md`
- `KEYWORD-STRATEGY.md`
- `CONTENT-QUALITY-AUDIT.md`

Tasks:

1. Add inventory thresholds for category-location pages.
2. Add index/noindex policy for low-inventory or thin pages.
3. Normalize provider service titles before generating `/providers/service/[slug]` pages.
4. Add related links based on category, city, service, and provider context.
5. Add sitemap inclusion only for pages that pass gates.
6. Add a lightweight audit script or documented command for:
   - empty pages
   - duplicate slugs
   - low provider count pages
   - noindexed pages accidentally in sitemap

Rules:

- Do not publish hundreds of new programmatic URLs in one run.
- Do not index empty result pages.
- Do not create pages whose only difference is city/category token replacement.

Validation:

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

### Phase 5: Authority and Trust

Implement from:

- `AUTHORITY-BUILDING.md`
- `CONTENT-QUALITY-AUDIT.md`
- `AI-CITATION-PROVIDER-VISIBILITY.md`

Tasks:

1. Resolve visible contact placeholders if confirmed data exists.
2. Add last-updated/editorial ownership notes to trust and guide pages.
3. Add provider badge/backlink guidance if appropriate.
4. Add marketplace data blocks only when backed by real data.
5. Enrich Organization schema after legal/business details are confirmed.
6. Add provider-facing search and AI discovery selling points to `/get-listed`, `/why-servicepros`, provider pricing surfaces, and `/platform-partners`.
7. Add the safe disclaimer that rankings and AI citations are not guaranteed.
8. Add or confirm `OAI-SearchBot` access in `app/robots.ts` if the current AI visibility strategy is to allow AI-powered search citation.

Rules:

- Do not invent legal contacts, responsible persons, POPIA Information Officer details, phone numbers, addresses, or response-time commitments.
- If details are unknown, leave the task blocked in the tracker rather than publishing made-up data.
- Do not promise guaranteed Google rankings, ChatGPT citations, Perplexity citations, Copilot citations, or AI recommendations.
- Use "search-friendly", "structured for discovery", "citation-ready", and "eligible to be discovered" language instead of guarantees.

### Phase 6: Image SEO

Implement from:

- `SEO-IMAGE-ASSET-PLAN.md`

Tasks:

1. Create `/public/images/seo/`.
2. Add page-specific OG images only if assets are provided or explicitly generated.
3. Wire page-specific `og:image`, dimensions, and alt text into metadata.
4. Add `ImageObject` or `primaryImageOfPage` where appropriate.
5. Improve provider/service image alt text formulas.

Rules:

- Do not trigger paid image generation unless explicitly asked.
- If generating images, state estimated cost first and follow the SEO image generation checklist.
- Do not use competitor logos or trademarked visual assets in generated images.

### Phase 7: Safe Comparison Pages

Implement from:

- `COMPARISON-PAGES-SAFE-STRATEGY.md`

Tasks:

1. Create only neutral model-comparison pages unless legal review approves named competitor pages.
2. Suggested safe routes:
   - `/compare/service-marketplace-models`
   - `/compare/provider-fee-models`
   - `/compare/how-to-compare-service-platforms`
   - `/compare/directory-vs-marketplace`
3. Use model categories, not competitor names.
4. Include methodology and disclosure blocks.
5. Link to `/dpm`, `/search`, `/services`, `/get-listed`, `/pricing`, `/why-servicepros`, `/verification`, and `/provider-terms`.
6. Add `WebPage`, `BreadcrumbList`, and `ItemList` schema.

Rules:

- Do not name competitors.
- Do not use competitor logos, screenshots, trademarks, pricing tables, or claims.
- Do not say or imply other companies mislead, overcharge, hide fees, or sell poor-quality leads.
- Use "varies", "usually", and "often" for general marketplace-model descriptions.
- Use exact claims only for ServicePros-controlled facts.
- Add a legal-review note in the tracker before publishing any comparison pages.

## Coding Standards

- Follow existing Next.js App Router patterns.
- Prefer existing helpers in `lib/seo.ts`, `lib/public-data.ts`, and current components.
- Keep edits scoped.
- Do not rewrite unrelated UI.
- Do not remove user changes.
- Use TypeScript types, not `any`, unless an existing local pattern requires it.
- Use `rg` for searching.
- Use `apply_patch` for manual edits.

## Completion Criteria

The SEO workbench is complete when:

- `docs/seo/IMPLEMENTATION-TRACKER.md` has every required item marked `Done` or explicitly `Deferred` with a reason.
- Sitemap and robots policies match the documented index strategy.
- Metadata and canonicals are consistent across public SEO pages.
- Schema helpers and JSON-LD output cover the documented priority routes.
- Programmatic pages have quality gates and noindex/sitemap controls.
- Snippet-ready content appears on priority pages.
- Provider-facing pages include safe search and AI discovery selling points.
- Safe comparison pages, if implemented, avoid named competitors and include disclosure/methodology.
- Lint, TypeScript, and build pass or any failure is documented as unrelated/pre-existing.
