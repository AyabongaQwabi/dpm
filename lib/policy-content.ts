import { getConfigStringValue } from '@/lib/config-store'
import { CONFIG_KEYS } from '@/lib/domain/config'
import { loadPlatformConfig } from '@/lib/platform-config'

export const POLICY_LAST_UPDATED = '2 July 2026'
export const POLICY_VERSION = '1.0'
export const PROVIDER_TERMS_LAST_UPDATED = '5 August 2026'
export const PROVIDER_TERMS_VERSION = '1.0'

/** Editorial ownership line for non-legal guide/explainer pages (DPM, how-it-works, pricing). */
export const GUIDE_LAST_REVIEWED = '5 August 2026'

/** /verification only — has its own date so Pro-membership-section edits don't silently bump the shared GUIDE_LAST_REVIEWED date on 7 unrelated pages. */
export const VERIFICATION_LAST_REVIEWED = '12 August 2026'

export async function getSupportEmail(): Promise<string> {
  const config = await loadPlatformConfig()
  try {
    return await getConfigStringValue(config, CONFIG_KEYS.SUPPORT_EMAIL)
  } catch {
    return 'support@servicepros.co.za'
  }
}
