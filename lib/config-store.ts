import type { SupabaseClient } from '@supabase/supabase-js'
import { InMemoryConfigStore, type ConfigStore } from '@/lib/domain/config'

/** Load platform_config rows into a ConfigStore for domain calculations. */
export async function loadConfigStore(supabase: SupabaseClient): Promise<ConfigStore> {
  const { data } = await supabase.from('platform_config').select('key, value')
  return new InMemoryConfigStore(
    Object.fromEntries((data ?? []).map((row) => [row.key, row.value])),
  )
}

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
