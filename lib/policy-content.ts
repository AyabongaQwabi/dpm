import { createClient } from '@/lib/supabase/server'
import { loadConfigStore, getConfigStringValue } from '@/lib/config-store'
import { CONFIG_KEYS } from '@/lib/domain/config'

export const POLICY_LAST_UPDATED = '2 July 2026'
export const POLICY_VERSION = '1.0'
export const PROVIDER_TERMS_LAST_UPDATED = '5 August 2026'
export const PROVIDER_TERMS_VERSION = '1.0'

export async function getSupportEmail(): Promise<string> {
  const supabase = await createClient()
  const config = await loadConfigStore(supabase)
  try {
    return await getConfigStringValue(config, CONFIG_KEYS.SUPPORT_EMAIL)
  } catch {
    return 'support@servicepros.co.za'
  }
}
