// Browser-free PDF renderer for the evangelism kit routes. This writes PDF
// drawing commands directly with pdf-lib instead of converting HTML with a
// browser engine, which keeps the serverless route small and deterministic.

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import { TIER_META, type VerificationTier } from '@/components/ui/VerifiedBadge'
import { PRINT_KIT_COLORS } from '@/lib/print-kit-config'

export interface PdfSize {
  widthMm: number
  heightMm: number
}

export interface PrintKitRenderParams {
  businessName: string
  tiers: VerificationTier[]
  qr: string | null
  profileUrl: string
  recognizedSince: string | null
  verifiedProviderCount: number | null
}

const ALL_TIERS: VerificationTier[] = ['contact', 'google', 'cipc', 'fica']
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

function fittedSize(text: string, font: PDFFont, preferredSize: number, maxWidth: number, minSize: number): number {
  let size = preferredSize
  while (size > minSize && font.widthOfTextAtSize(pdfText(text), size) > maxWidth) size -= 0.5
  return size
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

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function countLine(count: number | null): string | null {
  if (count === null || count < 1) return null
  return `One of ${new Intl.NumberFormat('en-ZA').format(count)} verified businesses on ServicePros`
}

function drawCheck(page: PDFPage, x: number, y: number, size: number, color: RGB, thickness = 2) {
  page.drawLine({
    start: { x: x + size * 0.25, y: y + size * 0.48 },
    end: { x: x + size * 0.42, y: y + size * 0.3 },
    thickness,
    color,
  })
  page.drawLine({
    start: { x: x + size * 0.42, y: y + size * 0.3 },
    end: { x: x + size * 0.76, y: y + size * 0.7 },
    thickness,
    color,
  })
}

function drawMedal(page: PDFPage, x: number, y: number, size: number, colors: RenderColors, held = true) {
  const center = { x: x + size / 2, y: y + size / 2 }
  const fill = held ? colors.accent : colors.white
  const stroke = held ? colors.primary : colors.muted
  const check = held ? colors.primary : colors.muted

  page.drawEllipse({
    x: center.x,
    y: center.y,
    xScale: size / 2,
    yScale: size / 2,
    color: fill,
    borderColor: stroke,
    borderWidth: held ? 1.8 : 1.2,
  })
  page.drawEllipse({
    x: center.x,
    y: center.y,
    xScale: size * 0.36,
    yScale: size * 0.36,
    borderColor: held ? colors.white : colors.muted,
    borderWidth: 1,
  })
  drawCheck(page, x + size * 0.18, y + size * 0.16, size * 0.64, check, held ? 2.4 : 1.5)
}

function drawSealBurst(page: PDFPage, centerX: number, centerY: number, radius: number, color: RGB) {
  for (let i = 0; i < 28; i += 1) {
    const angle = (Math.PI * 2 * i) / 28
    const inner = radius * 0.88
    const outer = radius
    page.drawLine({
      start: { x: centerX + Math.cos(angle) * inner, y: centerY + Math.sin(angle) * inner },
      end: { x: centerX + Math.cos(angle) * outer, y: centerY + Math.sin(angle) * outer },
      thickness: 1.2,
      color,
    })
  }
}

function drawCornerFlourish(page: PDFPage, x: number, y: number, sx: number, sy: number, color: RGB) {
  page.drawLine({ start: { x, y }, end: { x: x + sx * mm(18), y }, thickness: 1.1, color })
  page.drawLine({ start: { x, y }, end: { x, y: y + sy * mm(18) }, thickness: 1.1, color })
  page.drawEllipse({ x: x + sx * mm(7), y: y + sy * mm(7), xScale: mm(1.8), yScale: mm(1.8), color })
}

function drawRingDots(page: PDFPage, centerX: number, centerY: number, radius: number, color: RGB) {
  for (let i = 0; i < 34; i += 1) {
    const angle = (Math.PI * 2 * i) / 34
    if (Math.abs(Math.sin(angle)) > 0.72) continue
    page.drawEllipse({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      xScale: mm(0.75),
      yScale: mm(0.75),
      color,
    })
  }
}

type RenderColors = Awaited<ReturnType<typeof basePdf>>['colors']

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
    softGold: rgb(0.97, 0.9, 0.68),
    muted: rgb(0.68, 0.7, 0.67),
    pale: rgb(0.96, 0.95, 0.92),
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
  const qrImage = await embedQr(pdf, params.qr)

  page.drawRectangle({
    x: mm(4),
    y: mm(4),
    width: pageWidth - mm(8),
    height: pageHeight - mm(8),
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: mm(2.2),
  })
  page.drawRectangle({
    x: mm(9),
    y: mm(9),
    width: pageWidth - mm(18),
    height: pageHeight - mm(18),
    borderColor: colors.accent,
    borderWidth: 1.2,
  })

  const markSize = mm(17)
  drawMedal(page, pageWidth / 2 - markSize / 2, pageHeight - mm(42), markSize, colors, true)
  drawCenteredText(page, 'VERIFIED', bold, mm(9), pageHeight - mm(57), colors.primary, pageWidth)
  drawCenteredText(page, 'Booked with confidence.', bold, mm(11), pageHeight - mm(80), colors.ink, pageWidth)
  drawCenteredWrappedText(
    page,
    `${params.businessName} is a verified provider on ServicePros`,
    regular,
    mm(5),
    pageHeight - mm(96),
    mm(116),
    mm(6.5),
    colors.ink,
    pageWidth,
  )
  drawCenteredText(page, 'See real reviews. Book securely. No surprises.', bold, mm(4.2), pageHeight - mm(116), colors.primary, pageWidth)

  if (qrImage) {
    const qrSize = mm(58)
    page.drawRectangle({
      x: pageWidth / 2 - qrSize / 2 - mm(3),
      y: pageHeight - mm(185),
      width: qrSize + mm(6),
      height: qrSize + mm(6),
      color: colors.white,
      borderColor: colors.softGold,
      borderWidth: 1.4,
    })
    page.drawImage(qrImage, {
      x: pageWidth / 2 - qrSize / 2,
      y: pageHeight - mm(182),
      width: qrSize,
      height: qrSize,
    })
  } else {
    drawCenteredWrappedText(page, params.profileUrl, regular, mm(3.2), pageHeight - mm(148), mm(92), mm(4.5), colors.ink, pageWidth)
  }

  drawCenteredText(page, 'Scan to see verified reviews & book', bold, mm(5), mm(25), colors.accent, pageWidth)
  drawCenteredWrappedText(page, params.businessName, bold, mm(4.5), mm(16), mm(120), mm(5), colors.ink, pageWidth)
  drawCenteredText(page, 'servicepros.co.za', regular, mm(3.4), mm(10), colors.primary, pageWidth)

  return finish(pdf)
}

export async function renderCertificatePdf(params: PrintKitRenderParams, size: PdfSize): Promise<Buffer> {
  const { pdf, page, regular, bold, colors } = await basePdf(size)
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const qrImage = await embedQr(pdf, params.qr)
  const recognizedDate = formatDate(params.recognizedSince)

  page.drawRectangle({
    x: mm(10),
    y: mm(10),
    width: pageWidth - mm(20),
    height: pageHeight - mm(20),
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: mm(2.6),
  })
  page.drawRectangle({
    x: mm(16),
    y: mm(16),
    width: pageWidth - mm(32),
    height: pageHeight - mm(32),
    borderColor: colors.accent,
    borderWidth: 1.2,
  })
  page.drawRectangle({
    x: mm(21),
    y: mm(21),
    width: pageWidth - mm(42),
    height: pageHeight - mm(42),
    borderColor: colors.softGold,
    borderWidth: 0.8,
  })
  drawCornerFlourish(page, mm(26), pageHeight - mm(26), 1, -1, colors.accent)
  drawCornerFlourish(page, pageWidth - mm(26), pageHeight - mm(26), -1, -1, colors.accent)
  drawCornerFlourish(page, mm(26), mm(26), 1, 1, colors.accent)
  drawCornerFlourish(page, pageWidth - mm(26), mm(26), -1, 1, colors.accent)

  const sealX = pageWidth / 2
  const sealY = pageHeight - mm(55)
  drawSealBurst(page, sealX, sealY, mm(20), colors.softGold)
  page.drawEllipse({ x: sealX, y: sealY, xScale: mm(15), yScale: mm(15), color: colors.accent, borderColor: colors.primary, borderWidth: 1.4 })
  page.drawEllipse({ x: sealX, y: sealY, xScale: mm(10), yScale: mm(10), borderColor: colors.white, borderWidth: 1 })
  drawCheck(page, sealX - mm(6), sealY - mm(5), mm(12), colors.primary, 2.8)

  drawCenteredText(page, 'RECOGNISED BUSINESS', bold, mm(5), pageHeight - mm(85), colors.accent, pageWidth)

  const nameSize = fittedSize(params.businessName, bold, mm(13), mm(160), mm(8))
  let y = drawCenteredWrappedText(page, params.businessName, bold, nameSize, pageHeight - mm(108), mm(160), nameSize * 1.16, colors.ink, pageWidth)
  y = drawCenteredTextReturn(page, 'is recognised on ServicePros', regular, mm(6), y - mm(8), colors.primary, pageWidth)
  y = drawCenteredWrappedText(
    page,
    "This business has completed ServicePros' evidence-based verification process and is recognised by customers across South Africa who book with confidence.",
    regular,
    mm(4.7),
    y - mm(12),
    mm(142),
    mm(6.2),
    colors.ink,
    pageWidth,
  )

  drawCenteredText(page, 'Verification badges', bold, mm(4.5), y - mm(9), colors.primary, pageWidth)
  const badgeY = y - mm(31)
  const badgeGap = mm(8)
  const badgeSize = mm(18)
  const totalBadgeWidth = ALL_TIERS.length * mm(33) + (ALL_TIERS.length - 1) * badgeGap
  let badgeX = (pageWidth - totalBadgeWidth) / 2
  const held = new Set(params.tiers)
  ALL_TIERS.forEach((tier) => {
    const isHeld = held.has(tier)
    drawMedal(page, badgeX + mm(7.5), badgeY, badgeSize, colors, isHeld)
    const label = TIER_META[tier].short
    const labelColor = isHeld ? colors.ink : colors.muted
    const labelSize = fittedSize(label, bold, mm(3.4), mm(33), mm(2.8))
    drawCenteredTextInWidth(page, label, bold, labelSize, badgeX, badgeY - mm(7), mm(33), labelColor)
    badgeX += mm(33) + badgeGap
  })

  const socialLine = countLine(params.verifiedProviderCount)
  let statusY = badgeY - mm(23)
  if (recognizedDate) {
    drawCenteredText(page, `Recognised since ${recognizedDate}`, bold, mm(4.2), statusY, colors.primary, pageWidth)
    statusY -= mm(8)
  }
  if (socialLine) {
    drawCenteredText(page, socialLine, regular, mm(3.8), statusY, colors.ink, pageWidth)
  }

  if (qrImage) {
    const qrSize = mm(23)
    page.drawImage(qrImage, { x: pageWidth - mm(48), y: mm(34), width: qrSize, height: qrSize })
    page.drawText('Scan to view profile', { x: pageWidth - mm(52), y: mm(28), size: mm(2.8), font: regular, color: colors.ink })
  }
  drawCenteredText(page, 'Recognition reflects current verification status - servicepros.co.za', regular, mm(3.3), mm(18), colors.ink, pageWidth)

  return finish(pdf)
}

function drawCenteredTextReturn(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color: RGB,
  pageWidth: number,
): number {
  drawCenteredText(page, text, font, size, y, color, pageWidth)
  return y - size * 1.2
}

function drawCenteredTextInWidth(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  width: number,
  color: RGB,
) {
  const safeText = pdfText(text)
  page.drawText(safeText, { x: x + (width - font.widthOfTextAtSize(safeText, size)) / 2, y, size, font, color })
}

export async function renderStickerPdf(params: PrintKitRenderParams, size: PdfSize): Promise<Buffer> {
  const { pdf, page, regular, bold, colors } = await basePdf(size)
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const centerX = pageWidth / 2
  const centerY = pageHeight / 2
  const qrImage = await embedQr(pdf, params.qr)

  page.drawEllipse({
    x: centerX,
    y: centerY,
    xScale: mm(30),
    yScale: mm(30),
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: mm(1.2),
  })
  page.drawEllipse({ x: centerX, y: centerY, xScale: mm(26.5), yScale: mm(26.5), borderColor: colors.accent, borderWidth: 1.1 })
  drawRingDots(page, centerX, centerY, mm(24), colors.softGold)
  drawCenteredText(page, 'VERIFIED PROVIDER', bold, mm(3.3), centerY + mm(15), colors.primary, pageWidth)

  if (qrImage) {
    const qrSize = mm(24)
    page.drawRectangle({
      x: centerX - qrSize / 2 - mm(1.5),
      y: centerY - qrSize / 2 - mm(1.5),
      width: qrSize + mm(3),
      height: qrSize + mm(3),
      color: colors.white,
    })
    page.drawImage(qrImage, {
      x: centerX - qrSize / 2,
      y: centerY - qrSize / 2,
      width: qrSize,
      height: qrSize,
    })
  } else {
    drawCenteredWrappedText(page, params.profileUrl, regular, mm(2.2), centerY + mm(5), mm(35), mm(3), colors.ink, pageWidth)
  }

  drawCenteredWrappedText(page, params.businessName, regular, mm(2.45), centerY - mm(17.5), mm(43), mm(3), colors.ink, pageWidth)
  drawCenteredText(page, 'servicepros.co.za', bold, mm(2.4), centerY - mm(22.2), colors.accent, pageWidth)

  return finish(pdf)
}
