import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('sponsored inventory architecture', () => {
  it('renders sponsored category-city slots alongside the unchanged organic list', () => {
    const publicData = read('lib/public-data.ts')
    const categoryCityPage = read('app/(public)/providers/category/[slug]/in/[location]/page.tsx')

    expect(publicData).toContain('export async function getSponsoredForCategoryCity')
    expect(publicData).not.toContain('excludeProviderIds')
    expect(categoryCityPage).toContain("getSponsoredForCategoryCity(supabase, 'search_top_slot', categoryId, location)")
    expect(categoryCityPage).toContain("getSponsoredForCategoryCity(supabase, 'category_city_feature', categoryId, location)")
    expect(categoryCityPage).toContain('{providers.map((provider) => (')
  })

  it('uses duplicate-safe keys for sponsored slots that may also appear organically', () => {
    const categoryCityPage = read('app/(public)/providers/category/[slug]/in/[location]/page.tsx')

    expect(categoryCityPage).toContain('key={`sponsored-${provider.id}`}')
    expect(categoryCityPage).toContain('key={provider.id}')
  })

  it('derives sponsored density from config and the domain helper', () => {
    const publicData = read('lib/public-data.ts')
    const categoryCityPage = read('app/(public)/providers/category/[slug]/in/[location]/page.tsx')

    expect(publicData).toContain('maxSponsoredForOrganicCount')
    expect(publicData).toContain('SPONSORED_DENSITY_CAP_PER_TEN')
    expect(publicData).not.toContain('|| (limit > 0 ? 1 : 0)')
    expect(categoryCityPage).toContain('maxSponsoredForOrganicCount(providers.length, SPONSORED_DENSITY_CAP_PER_TEN)')
  })

  it('answers and builds the floating box placement without touching payment providers', () => {
    const config = read('config/sponsored-placements.json')
    const sponsoredConfig = read('lib/sponsored-config.ts')
    const publicLayout = read('app/(public)/layout.tsx')
    const floatingServer = read('components/sponsored/FloatingSponsoredPlacement.tsx')
    const floatingClient = read('components/sponsored/FloatingSponsoredBox.tsx')
    const actions = read('lib/actions/sponsored.ts')

    expect(config).toContain('"placementType": "floating_box", "priceRands": 99')
    expect(config).toContain('"floatingBoxDismissalHours": 24')
    expect(config).toContain('"rotationWindowHours": 1')
    expect(sponsoredConfig).toContain('SPONSORED_FLOATING_BOX_DECISIONS')
    expect(publicLayout).toContain('<FloatingSponsoredPlacement />')
    expect(floatingServer).toContain('getFloatingSponsoredProvider')
    expect(floatingClient).toContain('servicepros-floating-sponsored-dismissed-until')
    expect(actions).toContain('purchaseSponsoredPlacementAction')
    expect(actions).toContain("p_reference_type: 'sponsored_placement'")
    expect(actions).not.toContain('@/lib/payments/yoco')
  })

  it('uses configurable reservation inventory instead of making one visible slot unsellable', () => {
    const config = read('config/sponsored-placements.json')
    const actions = read('lib/actions/sponsored.ts')

    expect(config).toContain('"slotInventoryPerScope"')
    expect(actions).toContain('SPONSORED_SLOT_INVENTORY_PER_SCOPE[input.placementType]')
    expect(actions).not.toContain('const totalSlots = 1')
  })

  it('exposes sponsored placements in the provider dashboard', () => {
    const dashboard = read('app/provider-dashboard/sponsored/page.tsx')
    const nav = read('components/provider-dashboard/DashboardSidebar.tsx')

    expect(dashboard).toContain('purchaseSponsoredPlacementAction')
    expect(dashboard).toContain('Sponsored placements')
    expect(dashboard).toContain('Wallet:')
    expect(nav).toContain("href: '/provider-dashboard/sponsored'")
  })
})
