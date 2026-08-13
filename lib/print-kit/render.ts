// Shared HTML-to-PDF renderer for the evangelism kit routes. Uses
// puppeteer-core + @sparticuz/chromium so the route works inside a Vercel
// serverless function without shipping a full Chromium download as part of
// the framework's own puppeteer package.

import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export interface PdfSize {
  widthMm: number
  heightMm: number
}

export async function renderHtmlToPdf(html: string, size: PdfSize): Promise<Buffer> {
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
