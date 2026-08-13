// Eligibility gate for the evangelism kit (decal, certificate, sticker
// PDFs). Pure predicate, no DB access — callers pass in the fields already
// fetched from `providers`. A profile must be claimed and hold at least one
// evidence-based badge before any print asset is generated.
//
// Badge tiers are contact/google/cipc/fica, same four flags as
// components/ui/VerifiedBadge.tsx's tiersFromState() — duplicated here as a
// plain boolean check (not imported) because lib/domain/ stays React-free.

export interface PrintEligibilityInput {
  claim_status?: string | null
  verified_contact?: boolean | null
  verified_google?: boolean | null
  verified_cipc?: boolean | null
  verified_fica?: boolean | null
}

export function providerHasPrintEligibility(provider: PrintEligibilityInput): boolean {
  const claimStatus = provider.claim_status ?? 'claimed'
  if (claimStatus !== 'claimed') return false

  return Boolean(
    provider.verified_contact || provider.verified_google || provider.verified_cipc || provider.verified_fica,
  )
}
