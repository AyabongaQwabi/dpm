import embedConfig from '@/config/embed.json'

export type EmbedMode = 'services' | 'card' | 'reviews'

export const EMBED_MODES = embedConfig.modes as EmbedMode[]

export const EMBED_RATE_LIMIT = embedConfig.rateLimit

/**
 * TODO(aya): confirm — a ceiling-package perk giving embed-originated
 * bookings a reduced commission bracket is a pricing decision, not an
 * engineering one. Stays 0 (no special treatment) until confirmed; nothing
 * should branch on source === 'embed' unless this is non-zero.
 */
export const EMBED_COMMISSION_DISCOUNT_BPS = embedConfig.commission.embedCommissionDiscountBps

export const EMBED_WIDGET_DATA_MAX_AGE_SECONDS = embedConfig.cache.widgetDataMaxAgeSeconds

export const EMBED_REVIEWS_MAX_ITEMS = embedConfig.reviews.maxItems
