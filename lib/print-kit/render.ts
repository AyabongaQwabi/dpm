// Shared HTML-to-PDF renderer for the evangelism kit routes. Uses
// puppeteer-core + @sparticuz/chromium so the route works inside a Vercel
// serverless function without shipping a full Chromium download as part of
// the framework's own puppeteer package.

import type chromiumType from '@sparticuz/chromium'
import type puppeteerType from 'puppeteer-core'

export interface PdfSize {
  widthMm: number
  heightMm: number
}

const nativeImport = new Function('specifier', 'return import(specifier)') as <T>(specifier: string) => Promise<T>

let pdfDeps: Promise<{
  chromium: typeof chromiumType
  puppeteer: typeof puppeteerType
}> | null = null

async function loadPdfDeps() {
  pdfDeps ??= Promise.all([
    nativeImport<{ default: typeof chromiumType }>('@sparticuz/chromium'),
    nativeImport<typeof puppeteerType>('puppeteer-core'),
  ]).then(([chromiumModule, puppeteer]) => ({
    chromium: chromiumModule.default,
    puppeteer,
  }))

  return pdfDeps
}

export async function renderHtmlToPdf(html: string, size: PdfSize): Promise<Buffer> {
  const { chromium, puppeteer } = await loadPdfDeps()
  const executablePath = await chromium.executablePath()
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      width: `${size.widthMm}mm`,
      height: `${size.heightMm}mm`,
      printBackground: true,
      preferCSSPageSize: false,
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
