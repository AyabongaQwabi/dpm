// Brand font binaries for print-kit PDFs, embedded as base64 @font-face data
// URIs in the HTML handed to Puppeteer. Puppeteer renders real Chrome, so
// (unlike next/og's Satori renderer) real @font-face works — but next/font's
// self-hosted files aren't exposed on disk, so we load the same families
// from @fontsource instead, which ships plain .woff2 files.
//
// Weights used: Bricolage Grotesque 800 (headings), Hanken Grotesk 700 (body/labels).

import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

async function fontDataUri(pkgFile: string): Promise<string> {
  const filePath = require.resolve(pkgFile)
  const bytes = await readFile(filePath)
  return `data:font/woff2;base64,${bytes.toString('base64')}`
}

export interface PrintKitFonts {
  bricolage800: string
  hanken700: string
}

let cached: Promise<PrintKitFonts> | null = null

export function loadPrintKitFonts(): Promise<PrintKitFonts> {
  if (!cached) {
    cached = Promise.all([
      fontDataUri('@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2'),
      fontDataUri('@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-normal.woff2'),
    ]).then(([bricolage800, hanken700]) => ({ bricolage800, hanken700 }))
  }
  return cached
}

export function fontFaceCss(fonts: PrintKitFonts): string {
  return `
    @font-face {
      font-family: 'Bricolage Grotesque';
      font-weight: 800;
      src: url('${fonts.bricolage800}') format('woff2');
    }
    @font-face {
      font-family: 'Hanken Grotesk';
      font-weight: 700;
      src: url('${fonts.hanken700}') format('woff2');
    }
  `
}
