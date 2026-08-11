import { Icon } from '@/components/ui/Icon'

// Pro membership badge. Deliberately NOT part of VerifiedBadge.tsx — Pro is a
// paid membership, not a verification tier. It must never share the
// verification badges' colour, icon, or tooltip language. Renders alongside
// the strongest verification badge (see ProviderVerificationBadge), never
// instead of it, and carries no effect on ranking anywhere in the codebase.
//
// Gold #C8A44D, distinct from the verification family's green (#14684F) /
// primary / sky / accent palette. Same pill shape as verification badges by
// design (see A.4 decision) — differentiated by colour, icon, and "Pro" in
// the label, not by shape.

const PRO_TOOLTIP =
  'ServicePros Pro member — this provider pays for a Pro membership. It is not a verification badge and does not confirm anything about the business itself.'

const PRO_GOLD = '#C8A44D'

function BadgeTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group/probadge relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-lg border bg-card px-3 py-2 text-xs font-normal leading-snug text-card-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/probadge:opacity-100 group-focus-within/probadge:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

export function ProBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  const glyphClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <BadgeTooltip text={PRO_TOOLTIP}>
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClass}`}
        style={{ backgroundColor: `${PRO_GOLD}26`, color: PRO_GOLD }}
      >
        <Icon.sparkle className={glyphClass} weight="fill" />
        Pro
      </span>
    </BadgeTooltip>
  )
}
