// Store-agnostic helpers on top of ConfigStore (lib/domain/config.ts). The
// store implementation itself is lib/platform-config.ts's loadPlatformConfig()
// — a JSON-backed ConfigStore, not a DB fetch. There used to be a DB-backed
// loadConfigStore() here; it's gone, along with the platform_config table it
// read, per the JSON config migration (see lib/platform-config.ts's header
// comment for why).

import type { ConfigStore } from '@/lib/domain/config'

export async function getConfigJsonArray(
  store: ConfigStore,
  key: string,
): Promise<number[]> {
  const raw = await store.get(key)
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) throw new Error(`Config key "${key}" must be a JSON array`)
    return parsed.map(Number)
  }
  if (Array.isArray(raw)) return raw.map(Number)
  throw new Error(`Config key "${key}" must be a JSON array`)
}

export async function getConfigStringValue(
  store: ConfigStore,
  key: string,
): Promise<string> {
  const raw = await store.get(key)
  if (typeof raw !== 'string') {
    throw new Error(`Config key "${key}" must be a string`)
  }
  return raw
}
