# ServicePros Comparison Pages: Safe Strategy

Date: 2026-08-05
Skills used: seo-competitor-pages, seo-content, seo-authority-builder

## Position

Do not launch direct "ServicePros vs {Competitor}" or "{Competitor} alternatives" pages until legal review approves a comparison policy.

Instead, use neutral category-education pages that compare marketplace models, buyer workflows, and provider fee structures without naming specific companies or making claims about identifiable competitors. This lowers defamation, trademark, and misleading-advertising risk while still capturing comparison intent.

This is not legal advice. It is a conservative content strategy that should still be reviewed before publishing.

## Why avoid named competitor pages for now

South Africa's Advertising Regulatory Board administers the Code of Advertising Practice, and its code is updated over time. Comparative advertising also needs care around accuracy, substantiation, and whether a competitor is identifiable by name, logo, or implication.

Sources:

- https://www.arb.org.za/The_Codes/
- https://www.mondaq.com/southafrica/media-telecoms-it-entertainment/1596732/advertising-marketing-promotion-comparative-guide

## Approved Safer Page Types

### 1. Marketplace model comparison

URL:

```txt
/compare/service-marketplace-models
```

Title:

```txt
Service Marketplace Models Compared
```

H1:

```txt
Service marketplace models compared
```

Intent captured:

- service marketplace comparison
- pay per lead vs commission
- service provider directory vs marketplace
- booking platform for service providers

Content angle:

Compare models, not companies.

Comparison columns:

- Directory listing
- Pay-per-lead marketplace
- Booking and commission marketplace
- ServicePros model

### 2. Provider fee model explainer

URL:

```txt
/compare/provider-fee-models
```

Title:

```txt
Provider Fee Models: Leads, Listings, and Commission
```

H1:

```txt
Provider fee models: leads, listings, and commission
```

Content angle:

Explain how providers may pay across different marketplace types:

- monthly listing
- pay per enquiry
- pay per unlocked lead
- commission on completed work
- optional boosted visibility
- fulfilment or partner-service fees

Keep claims general unless ServicePros is the only row with specific verified terms.

### 3. Customer booking model explainer

URL:

```txt
/compare/how-to-compare-service-platforms
```

Title:

```txt
How to Compare Service Provider Platforms
```

H1:

```txt
How to compare service provider platforms
```

Content angle:

Help customers compare any platform using neutral criteria:

- visible provider profile
- reviews
- service/package pricing
- messaging
- payment handling
- refund rules
- verification signals
- support/contact clarity

### 4. Directory and marketplace guide

URL:

```txt
/compare/directory-vs-marketplace
```

Title:

```txt
Directory vs Marketplace for Local Services
```

H1:

```txt
Directory vs marketplace for local services
```

Content angle:

This supports the DPM entity strategy and can link to `/dpm`.

## Safe Comparison Matrix

Use this style instead of naming competitors.

| Criteria | Basic directory | Pay-per-lead marketplace | Booking marketplace | ServicePros |
| --- | --- | --- | --- | --- |
| Provider profile | Usually yes | Usually yes | Usually yes | Yes |
| Customer can compare services | Varies | Varies | Often yes | Yes |
| Customer booking flow | Usually off-platform | Varies | Often yes | Yes |
| Provider pays for enquiries | Varies | Often yes | Varies | No |
| Provider commission on completed work | Usually no | Varies | Often yes | Yes |
| Verification signals | Varies | Varies | Varies | Contact, Google, CIPC, FICA badges where available |
| Reviews | Varies | Varies | Often yes | Reviews from completed bookings |
| Pricing transparency | Varies | Varies | Varies | Service/package pricing where provider publishes it |

Rules:

- Use "varies", "usually", and "often" for broad model descriptions.
- Use exact claims only for ServicePros-controlled facts.
- Do not imply every competitor in a model behaves the same way.
- Do not name, logo, screenshot, or quote competitors without legal approval.

## Required Disclosure Block

Add this to comparison-model pages:

```txt
This guide explains common marketplace models for customers and providers. It is published by ServicePros, so ServicePros is described from our own platform terms and product design. Other platforms may use different rules, fees, or workflows; always check their current terms before deciding.
```

## Methodology Block

```txt
We compare platform models using criteria a customer or service provider can inspect before signing up: profile visibility, booking flow, pricing transparency, payment method, refund rules, verification signals, reviews, provider fees, and support channels.
```

## Claims Policy

Allowed:

- `ServicePros does not charge providers for enquiries.`
- `ServicePros charges commission only on completed, paid work.`
- `ServicePros uses credits for customer bookings.`
- `Some marketplace models charge providers to access enquiries.`
- `Some directories focus on discovery and send users off-platform to transact.`

Avoid:

- Named competitor superiority claims.
- "Cheapest", "best", or "most trusted" without independent substantiation.
- Claims that another company misleads users, overcharges, hides fees, or sells low-quality leads.
- Competitor screenshots, logos, or trademarks without review.
- Statements about competitor pricing unless sourced, dated, and approved.

## Page Template

Minimum word count: 1,200-1,800 words for model comparison pages.

```txt
H1: {Comparison topic}
Intro: Direct answer and who the page is for
H2: Quick comparison
Table comparing models
H2: What each model means
H3: Basic directory
H3: Pay-per-lead marketplace
H3: Booking marketplace
H3: ServicePros
H2: Which model suits customers?
H2: Which model suits providers?
H2: Questions to ask before choosing a platform
H2: ServicePros approach
CTA: Find providers / Get listed
Disclosure and last-updated note
```

## Schema Recommendation

Use `WebPage`, `BreadcrumbList`, and `ItemList`. Avoid `Product` schema for unnamed third-party models.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://servicepros.co.za/compare/service-marketplace-models#webpage",
      "url": "https://servicepros.co.za/compare/service-marketplace-models",
      "name": "Service marketplace models compared",
      "description": "A neutral guide to service marketplace models, including directories, pay-per-lead platforms, booking marketplaces, and the ServicePros model.",
      "publisher": { "@type": "Organization", "name": "Namoota Technology" }
    },
    {
      "@type": "ItemList",
      "name": "Service marketplace model comparison criteria",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Provider profile visibility" },
        { "@type": "ListItem", "position": 2, "name": "Customer booking flow" },
        { "@type": "ListItem", "position": 3, "name": "Provider fee model" },
        { "@type": "ListItem", "position": 4, "name": "Verification and review signals" }
      ]
    }
  ]
}
```

## Internal Links

From comparison pages, link to:

- `/dpm`
- `/search`
- `/services`
- `/get-listed`
- `/pricing`
- `/why-servicepros`
- `/verification`
- `/provider-terms`

## Review Workflow

Before publishing:

1. Confirm all ServicePros claims against current product and terms.
2. Remove any competitor names, logos, screenshots, or identifiable references.
3. Legal review the disclosure and methodology.
4. Add last-updated date.
5. Add schema validation.
6. Add page to sitemap only after review.

