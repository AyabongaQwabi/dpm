// Browser-free PDF renderer for the evangelism kit routes. This writes PDF
// drawing commands directly with pdf-lib instead of converting HTML with a
// browser engine, which keeps the serverless route small and deterministic.

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import { TIER_META, type VerificationTier } from '@/components/ui/VerifiedBadge'
import { PRINT_KIT_COLORS, PRINT_KIT_WORDMARK } from '@/lib/print-kit-config'

export interface PdfSize {
  widthMm: number
  heightMm: number
}

export interface PrintKitRenderParams {
  businessName: string
  tiers: VerificationTier[]
  qr: string | null
  profileUrl: string
}

const PT_PER_MM = 72 / 25.4

function mm(value: number): number {
  return value * PT_PER_MM
}

function hexColor(value: string): RGB {
  const hex = value.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex
  return rgb(
    Number.parseInt(full.slice(0, 2), 16) / 255,
    Number.parseInt(full.slice(2, 4), 16) / 255,
    Number.parseInt(full.slice(4, 6), 16) / 255,
  )
}

function pdfText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfText(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color: RGB,
  pageWidth: number,
) {
  const safeText = pdfText(text)
  page.drawText(safeText, {
    x: (pageWidth - font.widthOfTextAtSize(safeText, size)) / 2,
    y,
    size,
    font,
    color,
  })
}

function drawCenteredWrappedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: RGB,
  pageWidth: number,
): number {
  const lines = wrapText(text, font, size, maxWidth)
  lines.forEach((line, index) => {
    drawCenteredText(page, line, font, size, y - index * lineHeight, color, pageWidth)
  })
  return y - lines.length * lineHeight
}

async function embedQr(pdf: PDFDocument, qr: string | null) {
  if (!qr) return null
  const [, base64] = qr.split(',')
  if (!base64) return null
  try {
    return await pdf.embedPng(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
}

function drawBadgeMark(page: PDFPage, x: number, y: number, size: number, color: RGB) {
  page.drawEllipse({
    x: x + size / 2,
    y: y + size / 2,
    xScale: size / 2,
    yScale: size / 2,
    borderColor: color,
    borderWidth: 1.3,
  })
  page.drawLine({
    start: { x: x + size * 0.28, y: y + size * 0.48 },
    end: { x: x + size * 0.43, y: y + size * 0.33 },
    thickness: 1.5,
    color,
  })
  page.drawLine({
    start: { x: x + size * 0.43, y: y + size * 0.33 },
    end: { x: x + size * 0.72, y: y + size * 0.68 },
    thickness: 1.5,
    color,
  })
}

async function basePdf(size: PdfSize) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([mm(size.widthMm), mm(size.heightMm)])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const colors = {
    primary: hexColor(PRINT_KIT_COLORS.primary),
    accent: hexColor(PRINT_KIT_COLORS.accent),
    ink: hexColor(PRINT_KIT_COLORS.ink),
    paper: hexColor(PRINT_KIT_COLORS.paper),
    white: rgb(1, 1, 1),
  }

  page.drawRectangle({
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
    color: colors.paper,
  })

  return { pdf, page, regular, bold, colors }
}

async function finish(pdf: PDFDocument): Promise<Buffer> {
  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

export async function renderDecalPdf(params: PrintKitRenderParams, size: PdfSize): Promise<Buffer> {
  const { pdf, page, regular, bold, colors } = await basePdf(size)
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const cardX = mm(3)
  const cardY = mm(3)
  const cardW = pageWidth - mm(6)
  const cardH = pageHeight - mm(6)

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: mm(2),
  })

  drawCenteredText(page, PRINT_KIT_WORDMARK, bold, mm(8), pageHeight - mm(27), colors.primary, pageWidth)
  drawCenteredText(page, 'Scan to view & book', bold, mm(4), pageHeight - mm(39), colors.accent, pageWidth)

  const qrImage = await embedQr(pdf, params.qr)
  if (qrImage) {
    const qrSize = mm(48)
    page.drawImage(qrImage, {
      x: (pageWidth - qrSize) / 2,
      y: pageHeight - mm(94),
      width: qrSize,
      height: qrSize,
    })
  } else {
    drawCenteredWrappedText(page, params.profileUrl, regular, mm(3), pageHeight - mm(62), mm(95), mm(4), colors.ink, pageWidth)
  }

  const afterNameY = drawCenteredWrappedText(
    page,
    params.businessName,
    bold,
    mm(6),
    pageHeight - mm(111),
    mm(116),
    mm(7),
    colors.ink,
    pageWidth,
  )

  const chipHeight = mm(8)
  const gap = mm(2)
  const chipY = afterNameY - mm(9)
  const chipWidths = params.tiers.map((tier) => bold.widthOfTextAtSize(TIER_META[tier].short, mm(3.2)) + mm(14))
  const totalWidth = chipWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, chipWidths.length - 1)
  let x = (pageWidth - totalWidth) / 2

  params.tiers.forEach((tier, index) => {
    const width = chipWidths[index] ?? mm(24)
    page.drawRectangle({
      x,
      y: chipY,
      width,
      height: chipHeight,
      borderColor: colors.ink,
      borderWidth: 1,
    })
    drawBadgeMark(page, x + mm(2), chipY + mm(2), mm(4), colors.ink)
    page.drawText(TIER_META[tier].short, {
      x: x + mm(8),
      y: chipY + mm(2.3),
      size: mm(3.2),
      font: bold,
      color: colors.ink,
    })
    x += width + gap
  })

  return finish(pdf)
}

export async function renderCertificatePdf(params: PrintKitRenderParams, size: PdfSize): Promise<Buffer> {
  const { pdf, page, regular, bold, colors } = await basePdf(size)
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const sheetX = mm(10)
  const sheetY = mm(10)
  const sheetW = pageWidth - mm(20)
  const sheetH = pageHeight - mm(20)

  page.drawRectangle({
    x: sheetX,
    y: sheetY,
    width: sheetW,
    height: sheetH,
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: mm(3),
  })

  drawCenteredText(page, 'VERIFICATION CERTIFICATE', bold, mm(5), pageHeight - mm(36), colors.accent, pageWidth)
  drawCenteredText(page, PRINT_KIT_WORDMARK, bold, mm(12), pageHeight - mm(55), colors.primary, pageWidth)

  let y = drawCenteredWrappedText(
    page,
    params.businessName,
    bold,
    mm(10),
    pageHeight - mm(90),
    mm(160),
    mm(11),
    colors.ink,
    pageWidth,
  )

  y = drawCenteredWrappedText(
    page,
    "This certifies that the business named above has completed ServicePros' evidence-based verification process for the badge(s) listed below.",
    regular,
    mm(5),
    y - mm(10),
    mm(140),
    mm(7),
    colors.ink,
    pageWidth,
  )

  y -= mm(10)
  params.tiers.forEach((tier) => {
    const label = TIER_META[tier].label
    const rowW = bold.widthOfTextAtSize(label, mm(5)) + mm(14)
    const rowX = (pageWidth - rowW) / 2
    drawBadgeMark(page, rowX, y - mm(1), mm(6), colors.ink)
    page.drawText(label, {
      x: rowX + mm(10),
      y,
      size: mm(5),
      font: bold,
      color: colors.ink,
    })
    y -= mm(12)
  })

  const issued = `Issued ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })} - servicepros.co.za`
  drawCenteredText(page, issued, regular, mm(4), mm(25), colors.ink, pageWidth)

  return finish(pdf)
}

export async function renderStickerPdf(params: PrintKitRenderParams, size: PdfSize): Promise<Buffer> {
  const { pdf, page, regular, bold, colors } = await basePdf(size)
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const centerX = pageWidth / 2
  const centerY = pageHeight / 2

  page.drawEllipse({
    x: centerX,
    y: centerY,
    xScale: mm(30),
    yScale: mm(30),
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: mm(1.2),
  })

  drawCenteredText(page, PRINT_KIT_WORDMARK, bold, mm(3.4), centerY + mm(19), colors.primary, pageWidth)

  const qrImage = await embedQr(pdf, params.qr)
  if (qrImage) {
    const qrSize = mm(24)
    page.drawImage(qrImage, {
      x: centerX - qrSize / 2,
      y: centerY - mm(7),
      width: qrSize,
      height: qrSize,
    })
  }

  drawCenteredWrappedText(
    page,
    params.businessName,
    regular,
    mm(2.6),
    centerY - mm(13),
    mm(40),
    mm(3.2),
    colors.ink,
    pageWidth,
  )

  return finish(pdf)
}
