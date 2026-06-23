import { Icon } from '@/components/ui/Icon'

// Three independent verification tiers. A provider can hold any combination.
export type VerificationTier = 'contact' | 'cipc' | 'fica'

// Mirrors the business_type enum in
// supabase/migrations/20260620000003_verification_business_type.sql.
export type BusinessType = 'entrepreneur' | 'co_op' | 'company' | 'non_profit' | null

export interface VerificationState {
  contact?: boolean | null
  cipc?: boolean | null
  fica?: boolean | null
}

const TIER_META: Record<
  VerificationTier,
  { label: string; short: string; description: string; icon: typeof Icon.verified; className: string }
> = {
  contact: {
    label: 'Contact verified',
    short: 'Contact',
    description: 'Cell number and email address confirmed.',
    icon: Icon.chat,
    className: 'bg-primary/10 text-primary',
  },
  cipc: {
    label: 'CIPC verified',
    short: 'CIPC',
    description: 'Registered CIPC business verified.',
    icon: Icon.shield,
    className: 'bg-primary-accent/15 text-primary-accent',
  },
  fica: {
    label: 'FICA verified',
    short: 'FICA',
    description: 'Identity and proof of address verified (FICA).',
    icon: Icon.verified,
    className: 'bg-secondary text-secondary-foreground',
  },
}

export function tiersFromState(state: VerificationState): VerificationTier[] {
  const tiers: VerificationTier[] = []
  if (state.contact) tiers.push('contact')
  if (state.cipc) tiers.push('cipc')
  if (state.fica) tiers.push('fica')
  return tiers
}

// The single "latest" (strongest) tier a provider holds. Verification is
// layered: contact → CIPC → FICA, so FICA is the most recent/credible state.
// Provider cards show only this one badge, not the whole stack.
export function latestTier(state: VerificationState): VerificationTier | null {
  if (state.fica) return 'fica'
  if (state.cipc) return 'cipc'
  if (state.contact) return 'contact'
  return null
}

function isBusinessEntity(businessType?: BusinessType): boolean {
  return businessType === 'company' || businessType === 'co_op' || businessType === 'non_profit'
}

// Per-tier copy + colour for the single card badge. Each tooltip is specific to
// HOW the provider was verified — CIPC and FICA are explained distinctly so the
// badge isn't generic marketing text.
const CARD_BADGE: Record<
  VerificationTier,
  { icon: typeof Icon.verified; className: string; tooltip: string }
> = {
  contact: {
    icon: Icon.chat,
    className: 'bg-primary/10 text-primary',
    tooltip: 'Contact verified — we confirmed this provider’s cell number and email address before listing them.',
  },
  cipc: {
    icon: Icon.shield,
    className: 'bg-primary-accent/15 text-primary-accent',
    tooltip:
      'CIPC verified — registered as a real business with the Companies and Intellectual Property Commission (CIPC).',
  },
  fica: {
    icon: Icon.verified,
    className: 'bg-primary text-primary-foreground',
    tooltip:
      'FICA verified — identity and proof of address checked against FICA requirements (ID document plus address proof).',
  },
}

const UNVERIFIED_TOOLTIP = 'This provider hasn’t completed verification yet. Details are self-reported.'

// Lightweight CSS hover/focus tooltip — safe to nest inside a card-wide <Link>.
function BadgeTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group/vbadge relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-lg border bg-card px-3 py-2 text-xs font-normal leading-snug text-card-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/vbadge:opacity-100 group-focus-within/vbadge:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

// Single verification badge shown on provider cards. Shows the latest tier with
// friendly "Verified business" / "Verified vendor" wording (vendor = an
// individual rather than a registered entity), or a grey "Unverified" tag.
export function ProviderVerificationBadge({
  state,
  businessType,
  size = 'sm',
}: {
  state: VerificationState
  businessType?: BusinessType
  size?: 'sm' | 'md'
}) {
  const tier = latestTier(state)
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  const glyphClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  if (!tier) {
    return (
      <BadgeTooltip text={UNVERIFIED_TOOLTIP}>
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-muted text-muted-foreground ${sizeClass}`}
        >
          <Icon.shield className={glyphClass} />
          Unverified
        </span>
      </BadgeTooltip>
    )
  }

  const meta = CARD_BADGE[tier]
  const Glyph = meta.icon
  const label = `Verified ${isBusinessEntity(businessType) ? 'business' : 'vendor'}`

  return (
    <BadgeTooltip text={meta.tooltip}>
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${meta.className} ${sizeClass}`}>
        <Glyph className={glyphClass} weight="fill" />
        {label}
      </span>
    </BadgeTooltip>
  )
}

export function VerifiedBadge({
  tier,
  size = 'sm',
  showLabel = true,
}: {
  tier: VerificationTier
  size?: 'sm' | 'md'
  showLabel?: boolean
}) {
  const meta = TIER_META[tier]
  const Glyph = meta.icon
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${meta.className} ${
        size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <Glyph className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} weight="fill" />
      {showLabel ? meta.label : meta.short}
    </span>
  )
}

export function VerifiedBadgeRow({
  state,
  size = 'sm',
  showLabel = true,
}: {
  state: VerificationState
  size?: 'sm' | 'md'
  showLabel?: boolean
}) {
  const tiers = tiersFromState(state)
  if (!tiers.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tiers.map((tier) => (
        <VerifiedBadge key={tier} tier={tier} size={size} showLabel={showLabel} />
      ))}
    </div>
  )
}

export { TIER_META }
