// Badge chip row shared by OG image templates. Tier order/labels come from
// components/ui/VerifiedBadge.tsx (tiersFromState, TIER_META) so OG images
// never drift from what the profile page displays. Icons are drawn as plain
// inline SVG paths (Satori can't render the Phosphor React icon components
// TIER_META references, so this repeats the same glyphs used in the
// print-kit PDFs — see lib/print-kit/badges.ts).

import { TIER_META, tiersFromState, type VerificationState, type VerificationTier } from '@/components/ui/VerifiedBadge'

const TIER_GLYPH_PATHS: Record<VerificationTier, React.ReactNode> = {
  contact: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10h8M8 14h5" strokeLinecap="round" />
    </>
  ),
  google: (
    <>
      <path d="M12 3v6l4 4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  cipc: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  fica: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.2 2.2L16 10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
}

export function heldTiers(state: VerificationState): VerificationTier[] {
  return tiersFromState(state)
}

export function OgBadgeRow({ tiers, ink }: { tiers: VerificationTier[]; ink: string }) {
  if (!tiers.length) return null
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {tiers.map((tier) => (
        <div
          key={tier}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 999,
            border: `2px solid ${ink}`,
            fontSize: 20,
            fontWeight: 700,
            color: ink,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2}>
            {TIER_GLYPH_PATHS[tier]}
          </svg>
          {TIER_META[tier].short}
        </div>
      ))}
    </div>
  )
}
