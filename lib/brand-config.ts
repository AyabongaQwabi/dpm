// House colours and wordmark shared by every generated-image feature
// (evangelism kit PDFs, OG images). Single source of truth so print and
// share assets never drift from each other. Mirrors --primary/--accent in
// app/globals.css (default/Highveld theme only — not per-vertical).

import brandConfig from '../config/brand.json'

export const BRAND_COLORS = brandConfig.colors
export const BRAND_WORDMARK = brandConfig.wordmark
