import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('getLocations — no capped-then-aggregate bug', () => {
  it('aggregates over every published provider, not a capped sample', () => {
    const publicData = read('lib/public-data.ts')
    const fnStart = publicData.indexOf('export async function getLocations')
    const fnEnd = publicData.indexOf('\nexport async function', fnStart + 1)
    const fnBody = publicData.slice(fnStart, fnEnd === -1 ? undefined : fnEnd)

    expect(fnBody).toContain("from('providers')")
    expect(fnBody).toContain("select('location_city')")
    expect(fnBody).toContain("eq('is_published', true)")
    // The bug was applying .limit(200) to the query BEFORE grouping in JS,
    // which aggregated only an arbitrary 200-row slice instead of the full
    // published-provider set. The `limit` parameter must only slice the
    // already-aggregated, already-sorted result.
    expect(fnBody).not.toMatch(/\.not\('location_city', 'is', null\)\s*\.limit\(/)
    expect(fnBody).toMatch(/\.slice\(0, limit\)/)
  })
})

describe('/browse/cities — long tail reachability', () => {
  it('reuses the shared min-tile-providers threshold, not a new one', () => {
    const page = read('app/(public)/browse/cities/page.tsx')
    expect(page).toContain("import { MIN_TILE_PROVIDERS } from '@/lib/browse-config'")
    expect(page).toContain('filterVisibleTiles(')
  })

  it('fetches a large-enough location pool to cover the real long tail', () => {
    const page = read('app/(public)/browse/cities/page.tsx')
    expect(page).toMatch(/getLocations\(supabase, \d{2,}\)/)
  })
})
