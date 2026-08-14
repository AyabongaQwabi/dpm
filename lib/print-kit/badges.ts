// Badge tier order shared by every print-kit template. The renderer gets
// labels from components/ui/VerifiedBadge.tsx so the PDFs never drift from
// what the profile page displays.

import { tiersFromState, type VerificationState, type VerificationTier } from '@/components/ui/VerifiedBadge'

export function heldTiers(state: VerificationState): VerificationTier[] {
  return tiersFromState(state)
}
