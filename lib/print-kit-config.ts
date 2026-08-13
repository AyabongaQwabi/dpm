// Print-kit PDF layout constants (decal, certificate, sticker). Business/
// print values only — no database mirror. Edit config/print-kit.json to
// change; a deploy is required to pick it up (static import). Brand colors
// and wordmark live in config/brand.json — see lib/brand-config.ts — shared
// with the OG image routes so both stay on one source of truth.

import printKitConfig from '../config/print-kit.json'
import { BRAND_COLORS, BRAND_WORDMARK } from './brand-config'

export const PRINT_KIT_DPI = printKitConfig.dpi
export const PRINT_KIT_WORDMARK = BRAND_WORDMARK
export const PRINT_KIT_COLORS = BRAND_COLORS

export const PRINT_KIT_DECAL_A5 = printKitConfig.decalA5
export const PRINT_KIT_CERTIFICATE_A4 = printKitConfig.certificateA4
export const PRINT_KIT_STICKER_CIRCULAR = printKitConfig.stickerCircular
