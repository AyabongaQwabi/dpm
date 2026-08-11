import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('Pro marketing page', () => {
  const page = read('app/(public)/pro/page.tsx')

  it('derives pricing and package inclusion from config instead of rand literals', () => {
    expect(page).toContain('PRO_MEMBERSHIP_CONFIG')
    expect(page).toContain('PACKAGE_NUMBERS_INCLUDING_PRO')
    expect(page).toContain('PACKAGES')
    expect(page).not.toMatch(/R\d/)
  })

  it('renders the required CTA states from real provider, subscription, and membership data', () => {
    expect(page).toContain('getOptionalUser')
    expect(page).toContain('getProMembership')
    expect(page).toContain('provider_subscriptions')
    expect(page).toContain('verified_contact')
    expect(page).toContain('Sign up as provider')
    expect(page).toContain('Verify first')
    expect(page).toContain('Get Pro')
    expect(page).toContain('Pro already included')
    expect(page).toContain('Manage Pro')
    expect(page).toContain('Reactivate Pro')
    expect(page).toContain("href: BILLING_PATH")
  })

  it('keeps Pro separate from verification, search placement, and commission changes', () => {
    expect(page).toContain('What Pro is not')
    expect(page).toContain('Not verification')
    expect(page).toContain('Not search placement')
    expect(page).toContain('Not a commission change')
    expect(page).toContain('/verification')
  })

  it('does not make customer acquisition or ranking promises', () => {
    expect(page).not.toMatch(/get more customers/i)
    expect(page).not.toMatch(/more leads/i)
    expect(page).not.toMatch(/rank higher/i)
    expect(page).not.toMatch(/stand out in search/i)
    expect(page).not.toMatch(/priority promotion/i)
    expect(page).not.toMatch(/search boost/i)
  })

  it('is discoverable from pricing, footer, and provider dashboard Pro settings', () => {
    expect(read('components/pricing/ProviderPricingContent.tsx')).toContain('href="/pro"')
    expect(read('components/SiteFooter.tsx')).toContain('href="/pro"')
    expect(read('app/provider-dashboard/pro/page.tsx')).toContain('href="/pro"')
  })

  it('marks cancellation wording for legal review', () => {
    expect(page).toContain('TODO(aya): legal review')
  })
})
