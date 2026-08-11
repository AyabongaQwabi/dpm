import providerWalletConfig from '@/config/provider-wallet.json'

const topUpPresets = providerWalletConfig.topUpPresets
  .map((amount) => Math.round(Number(amount)))
  .filter((amount) => Number.isFinite(amount) && amount > 0)

export const PROVIDER_WALLET_TOP_UP_PRESETS = topUpPresets
export const PROVIDER_WALLET_MIN_TOP_UP_CREDITS = Math.round(providerWalletConfig.minTopUpCredits)
export const PROVIDER_WALLET_MAX_TOP_UP_CREDITS = Math.round(providerWalletConfig.maxTopUpCredits)
export const PROVIDER_WALLET_CURRENCY = providerWalletConfig.currency
export const PROVIDER_WALLET_CREDIT_VALUE = providerWalletConfig.creditValue

export function clampProviderTopUpAmount(amount: number): number {
  return Math.max(
    PROVIDER_WALLET_MIN_TOP_UP_CREDITS,
    Math.min(PROVIDER_WALLET_MAX_TOP_UP_CREDITS, Math.round(amount)),
  )
}
