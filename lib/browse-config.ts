/**
 * Typed accessors for config/browse.json.
 *
 * Follows the same pattern as lib/liquidity-config.ts: a static JSON import
 * behind named accessors, so homepage/browse threshold logic carries no
 * hardcoded values. `confirmed: false` marks a value the product owner has
 * not signed off yet (`TODO(aya): confirm`).
 *
 * Documented in config/README.md.
 */

import browse from '@/config/browse.json'

export { browse }

/** Minimum published providers for a category or city tile to appear on the homepage/browse grid. TODO(aya): confirm — suggested 5. */
export const MIN_TILE_PROVIDERS = browse.minTileProviders.value

/** Fallback city for the nav "near you" item when nothing else resolves. TODO(aya): confirm. */
export const DEFAULT_CITY = browse.defaultCity.value
