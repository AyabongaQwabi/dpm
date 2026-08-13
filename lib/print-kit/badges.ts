// Badge glyph + label markup shared by every print-kit template. Tier order
// and labels come from components/ui/VerifiedBadge.tsx (tiersFromState,
// TIER_META) so the PDFs never drift from what the profile page displays.
// Icons are drawn as plain inline SVG (not the Phosphor React components,
// which can't render into a static HTML string handed to Puppeteer).

import { TIER_META, tiersFromState, type VerificationState, type VerificationTier } from '@/components/ui/VerifiedBadge'

const TIER_GLYPHS: Record<VerificationTier, string> = {
  contact: '<circle cx="12" cy="12" r="9"/><path d="M8 10h8M8 14h5" stroke-linecap="round"/>',
  google: '<path d="M12 3v6l4 4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="9"/>',
  cipc: '<path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  fica: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.2 2.2L16 10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function heldTiers(state: VerificationState): VerificationTier[] {
  return tiersFromState(state)
}

/** Compact badge chip row for the decal/sticker artwork. */
export function badgeChipsHtml(tiers: VerificationTier[], ink: string): string {
  return tiers
    .map((tier) => {
      const meta = TIER_META[tier]
      return `
        <span class="badge-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="2">${TIER_GLYPHS[tier]}</svg>
          ${escapeHtml(meta.short)}
        </span>
      `
    })
    .join('')
}

/** Full label rows for the certificate. */
export function badgeListHtml(tiers: VerificationTier[], ink: string): string {
  return tiers
    .map((tier) => {
      const meta = TIER_META[tier]
      return `
        <li class="badge-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="2">${TIER_GLYPHS[tier]}</svg>
          <span>${escapeHtml(meta.label)}</span>
        </li>
      `
    })
    .join('')
}
