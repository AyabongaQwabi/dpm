/**
 * Tile-visibility rules for the homepage/browse category and city grids.
 * Pure — no DB, no framework imports (ARCH-006). Threshold is injected by
 * the caller from lib/browse-config.ts so this stays testable without
 * config wiring.
 */

export function isTileVisible(providerCount: number, minTileProviders: number): boolean {
  return providerCount >= minTileProviders
}

export function filterVisibleTiles<T extends { providerCount: number }>(
  tiles: T[],
  minTileProviders: number,
): T[] {
  return tiles.filter((tile) => isTileVisible(tile.providerCount, minTileProviders))
}
