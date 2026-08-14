// Brand font binaries for next/og's ImageResponse (Satori). Satori only
// parses ttf/otf/woff — not woff2 — so this loads the .woff variant from the
// same @fontsource packages used by the print-kit PDFs (lib/print-kit/fonts.ts
// loads .woff2 instead, since Puppeteer's real Chrome has no such restriction).

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const bricolage800Path = join(
  process.cwd(),
  'node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff',
)
const hanken700Path = join(
  process.cwd(),
  'node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-normal.woff',
)

async function fontBytes(filePath: string): Promise<Buffer> {
  return readFile(filePath)
}

export interface OgImageFont {
  name: string
  data: Buffer
  weight: 400 | 700 | 800 | 900
  style: 'normal'
}

let cached: Promise<OgImageFont[]> | null = null

export function loadOgImageFonts(): Promise<OgImageFont[]> {
  if (!cached) {
    cached = Promise.all([fontBytes(bricolage800Path), fontBytes(hanken700Path)]).then(([bricolage800, hanken700]) => [
      { name: 'Bricolage Grotesque', data: bricolage800, weight: 800, style: 'normal' },
      { name: 'Hanken Grotesk', data: hanken700, weight: 700, style: 'normal' },
    ] satisfies OgImageFont[])
  }
  return cached
}
