# ServicePros Design System

This file is the source of truth for visual direction when using UI design skills or generating new interface concepts for ServicePros. Do not let external mood-board output replace the brand tokens in `app/globals.css`.

## Brand Base

ServicePros is a South African local-services marketplace. The interface should feel trusted, practical, warm, and provider-first. It is not a spa, wellness, luxury beauty, generic fintech, or navy-and-gold SaaS brand.

Primary source files:

- `app/globals.css` for Tailwind tokens, fonts, radius, craft accents, and vertical themes.
- `components/SiteNav.tsx` for the public navigation and logo treatment.
- `/images/logo-wordmark.png` for the current wordmark.

## Color Tokens

Use the CSS variables and Tailwind token names already defined in `app/globals.css`.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Page background | `--background` / `bg-background` | `hsl(40 38% 97%)` | Main app and public page canvas. |
| Text | `--foreground` / `text-foreground` | `hsl(25 28% 16%)` | Main headings and body text. |
| Cards | `--card` / `bg-card` | `hsl(40 44% 99%)` | Panels, repeated items, modals. |
| Primary brand | `--primary` / `bg-primary` | `hsl(145 32% 22%)` | Deep bushveld green, trust surfaces, dark CTAs, verification-adjacent UI. |
| Main CTA | `--primary-accent` / `bg-primary-accent` | `hsl(32 78% 46%)` | Ochre action buttons, focus accents, key calls to action. |
| Secondary accent | `--accent` / `bg-accent` | `hsl(43 74% 52%)` | Warm gold accents, craft stripe, highlights. |
| Borders | `--border` / `border-border` | `hsl(38 24% 85%)` | Standard dividers and card borders. |
| Muted text | `--muted-foreground` / `text-muted-foreground` | `hsl(28 12% 42%)` | Help text, secondary metadata, timestamps. |

Rules:

- Prefer `bg-primary-accent text-primary-accent-foreground` for primary action buttons.
- Prefer `text-primary-accent` for small section labels and active details.
- Use `bg-primary` sparingly for dark, high-trust surfaces.
- Use `craft-rule` as a brand signature strip. Do not replace it with generic gradients.
- Pro gold is for Pro status and Pro-only affordances. It must not become the whole product palette.
- Verification green should align with the primary green family and the existing `#14684F` usage.
- Avoid spa palettes, lavender, pastel pink, beige-only layouts, generic navy/gold dashboards, and purple gradients.

## Typography

Use the repo font tokens:

- `--font-sans`: Hanken Grotesk for app UI and body copy.
- `--font-display`: Bricolage Grotesque for headings and display moments.
- `--font-mono`: Spline Sans Mono for technical/accounting values when useful.

Do not introduce decorative serif/display fonts from generated references unless the repo is deliberately changing its brand system.

## Layout Direction

Public marketplace pages should be generous but not empty: clear first-viewport identity, provider trust signals, service discovery, and direct actions.

Provider dashboard pages should feel operational, denser, and better aligned than marketing pages. Use restrained panels, predictable grids, clear status feedback, and compact page headers. Do not use oversized landing-page hero treatment inside dashboard tools.

Provider profiles should prioritize:

- Cover image or branded profile header for Pro providers.
- Logo/avatar, business name, category, location, languages, and verification badges.
- Tags in a horizontally scrollable row with visible left/right controls when overflowing.
- Custom CTA and pinned service when configured.
- Services as clickable cards where the whole card opens the service page.
- Stories as mobile-cropped, short-form content, visually distinct from long posts.

## Components

- Use existing Tailwind tokens over hardcoded colors.
- Use `rounded-[var(--radius)]` or existing local radius conventions.
- Use lucide icons where an icon is needed.
- Buttons need clear hierarchy: primary action, secondary action, destructive/cancel.
- Forms must give visible save feedback after successful submission.
- Financial and billing UI must show live values from config or data, never decorative fake values.

## Skill Usage

When using `ui-ux-pro-max` or any external UI skill:

1. Run it for structure, patterns, competitive inspiration, and interaction ideas.
2. Replace any generated palette with the ServicePros tokens above.
3. Check the result against the actual logo, `craft-rule`, and existing public nav.
4. Reject outputs that describe ServicePros as beauty, spa, wellness, luxury salon, or generic navy/gold SaaS.

## Pre-Ship UI Check

Before calling UI work done:

- 375px mobile layout has no clipped text or overlapping controls.
- Provider tags, badges, CTA, cover image, and pinned service render from real data.
- Dashboard spacing is consistent across the page, especially margins and section gutters.
- Actions provide pending, success, and error feedback.
- Colors are from `app/globals.css` tokens unless there is a documented exception.
