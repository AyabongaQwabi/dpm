import { describe, expect, it } from 'vitest'
import { providerHasPrintEligibility } from '../print-kit'

describe('providerHasPrintEligibility', () => {
  it('denies an unclaimed profile even if it holds badges', () => {
    expect(
      providerHasPrintEligibility({
        claim_status: 'unclaimed',
        verified_contact: true,
        verified_google: true,
        verified_cipc: true,
        verified_fica: true,
      }),
    ).toBe(false)
  })

  it('denies a claim-pending profile', () => {
    expect(
      providerHasPrintEligibility({
        claim_status: 'claim_pending',
        verified_fica: true,
      }),
    ).toBe(false)
  })

  it('denies a claimed profile with zero badges', () => {
    expect(
      providerHasPrintEligibility({
        claim_status: 'claimed',
        verified_contact: false,
        verified_google: false,
        verified_cipc: false,
        verified_fica: false,
      }),
    ).toBe(false)
  })

  it('allows a claimed profile with exactly one badge', () => {
    expect(
      providerHasPrintEligibility({
        claim_status: 'claimed',
        verified_contact: true,
      }),
    ).toBe(true)
  })

  it('allows a claimed profile holding multiple badges', () => {
    expect(
      providerHasPrintEligibility({
        claim_status: 'claimed',
        verified_cipc: true,
        verified_fica: true,
      }),
    ).toBe(true)
  })

  it('defaults missing claim_status to claimed, matching the profile page fallback', () => {
    expect(
      providerHasPrintEligibility({
        verified_google: true,
      }),
    ).toBe(true)
  })
})
