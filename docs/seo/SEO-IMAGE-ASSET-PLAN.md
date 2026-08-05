# ServicePros SEO Image Asset Plan

Date: 2026-08-05
Skills used: seo-image-gen, seo-technical, seo-schema

## Scope

This is a planning pass, not an image generation run. No paid image generation was triggered.

Current public assets include:

- `/images/og-default.png`
- `/images/logo-mark.png`
- `/images/logo-wordmark.png`
- `/images/hero-highveld.png`
- `/images/regions/cape-town.png`
- `/images/regions/durban.png`
- `/images/regions/johannesburg.png`
- `/images/regions/pretoria.png`
- `/images/regions/sandton.png`
- `/images/regions/stellenbosch.png`
- auth images, icons, favicon, placeholders

## Image SEO Score

Estimated image SEO readiness: 70/100.

The platform has enough assets for baseline social previews and regional browsing. The gaps are page-specific OG images, schema `ImageObject` usage, SEO-friendly filenames for future generated assets, and a clear policy for provider-uploaded images.

Google image guidance recommends crawlable HTML image elements, descriptive filenames, useful alt text, representative page images, and image metadata such as `og:image` or schema `primaryImageOfPage`.

Source:

- https://developers.google.com/search/docs/appearance/google-images

## Priority Asset Briefs

### 1. DPM OG image

Use case: OG/social preview.

Filename:

```txt
dpm-directory-provider-marketplace-1200x630.webp
```

Prompt brief:

```txt
A clean editorial product visual for ServicePros showing a South African local services marketplace: provider profile cards, category tiles, booking status, and trust badges arranged as a modern web dashboard. Warm daylight, crisp interface details, professional but human, no readable fake brand names, no competitor logos, no exaggerated claims.
```

Alt text:

```txt
ServicePros Directory and Provider Marketplace interface showing provider profiles, categories, booking, and verification signals.
```

Schema:

```json
{
  "@type": "ImageObject",
  "url": "https://servicepros.co.za/images/seo/dpm-directory-provider-marketplace-1200x630.webp",
  "width": 1200,
  "height": 630,
  "caption": "ServicePros Directory and Provider Marketplace"
}
```

### 2. Verification OG image

Filename:

```txt
servicepros-verification-badges-1200x630.webp
```

Prompt brief:

```txt
A polished web product image showing ServicePros verification badges for Contact, Google, CIPC, and FICA next to provider profile cards. South African marketplace context, restrained professional colors, clear trust hierarchy, no third-party logos beyond generic badge concepts, no fake certification seals.
```

Alt text:

```txt
ServicePros verification badge examples showing contact, Google, CIPC, and FICA trust signals on provider profiles.
```

### 3. Pricing credits OG image

Filename:

```txt
servicepros-credits-pricing-1200x630.webp
```

Prompt brief:

```txt
A clean product-style image for ServicePros credits and pricing: a credit wallet, ZAR amounts, service booking card, and simple package tiles inside a modern marketplace interface. Professional fintech feel, no tiny unreadable copy, no misleading discount claims.
```

Alt text:

```txt
ServicePros credits and pricing interface showing a customer wallet, credit packs, and a service booking summary.
```

### 4. Get listed provider OG image

Filename:

```txt
get-listed-service-provider-south-africa-1200x630.webp
```

Prompt brief:

```txt
A realistic product visual of a South African service provider creating a ServicePros profile: profile editor, service cards, verification checklist, and booking enquiries. Clean web interface composition, optimistic but practical, no competitor references.
```

Alt text:

```txt
ServicePros provider onboarding screen showing profile setup, services, verification, and booking tools.
```

### 5. Platform partners OG image

Filename:

```txt
servicepros-platform-partners-1200x630.webp
```

Prompt brief:

```txt
A modern marketplace ecosystem visual showing ServicePros providers connected to specialist platform partners for design, marketing, admin, and growth services. Clean SaaS-style interface, South African business context, no third-party brand names or logos.
```

Alt text:

```txt
ServicePros platform partner ecosystem connecting providers with specialist business support services.
```

## Service and Provider Image Rules

### Provider-uploaded service images

Requirements:

- Use actual work, team, location, product, or service context where possible.
- Prefer horizontal 4:3 or 16:9 images.
- Require meaningful alt text derived from service title and provider name.
- Avoid text-heavy posters as primary service images.
- Avoid low-resolution, watermarked, or unrelated stock images.

Suggested alt text formula:

```txt
{Service title} from {Provider name}{ in City}
```

### Provider profile images

Requirements:

- Business logo or real team/work image.
- Fallback to generated initials/avatar only when no image is available.
- Avoid using a generic placeholder as `og:image` for provider profiles if a better provider image exists.

## Implementation Recommendations

1. Create `/public/images/seo/`.
2. Add static OG images for DPM, pricing, verification, get-listed, why-servicepros, platform-partners, and referral-agents.
3. Extend `DEFAULT_OG_IMAGE` with page-specific helpers.
4. Add `primaryImageOfPage` to WebPage schema for important guide pages.
5. Add service image dimensions to service detail metadata when known.
6. Convert generated/edited PNGs to WebP at quality 80-85.
7. Target:
   - OG images: 1200x630, under 250KB.
   - Hero images: 1600x900 or 1920x1080, under 350KB.
   - Thumbnails/cards: under 100KB.

## Image Generation Cost Notes

If generated later with the SEO image generation extension:

- OG/social preview at 1K: approximately $0.04/image.
- Hero image at 2K: approximately $0.08/image.
- Infographic at 2K-4K: approximately $0.08-$0.16/image.

## QA Checklist

- Image file names are descriptive and lowercase.
- Every meaningful image has useful alt text.
- Decorative images use empty alt text.
- `og:image` is page-specific for high-value pages.
- Schema image matches visible page content.
- No competitor logos, copied UI, or trademarked marks appear in generated comparison/positioning assets.
- Images are embedded with standard image elements or Next Image where possible.

