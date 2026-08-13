import { handlePrintKitPdfRequest } from '@/lib/print-kit/route-handler'
import { badgeListHtml } from '@/lib/print-kit/badges'
import { PRINT_KIT_CERTIFICATE_A4, PRINT_KIT_COLORS, PRINT_KIT_WORDMARK } from '@/lib/print-kit-config'

export const runtime = 'nodejs'
export const maxDuration = 60

const { widthMm, heightMm, bleedMm } = PRINT_KIT_CERTIFICATE_A4
const colors = PRINT_KIT_COLORS
const wordmark = PRINT_KIT_WORDMARK

function issuedDate(): string {
  return new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildHtml(params: { businessName: string; tiers: Parameters<typeof badgeListHtml>[0]; fontCss: string }): string {
  const pageW = widthMm + bleedMm * 2
  const pageH = heightMm + bleedMm * 2
  const badges = badgeListHtml(params.tiers, colors.ink)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  ${params.fontCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
  body {
    width: ${pageW}mm;
    height: ${pageH}mm;
    background: ${colors.paper};
    font-family: 'Hanken Grotesk', Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sheet {
    width: ${widthMm - 20}mm;
    height: ${heightMm - 20}mm;
    background: #fff;
    border: 3mm solid ${colors.primary};
    border-radius: 4mm;
    padding: 16mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .kicker {
    font-weight: 700;
    font-size: 5mm;
    letter-spacing: 0.5mm;
    text-transform: uppercase;
    color: ${colors.accent};
  }
  .wordmark {
    margin-top: 4mm;
    font-family: 'Bricolage Grotesque', Arial, sans-serif;
    font-weight: 800;
    font-size: 12mm;
    color: ${colors.primary};
    line-height: 1.1;
  }
  .business-name {
    margin-top: 16mm;
    font-family: 'Bricolage Grotesque', Arial, sans-serif;
    font-weight: 800;
    font-size: 10mm;
    color: ${colors.ink};
  }
  .statement {
    margin-top: 8mm;
    font-size: 5mm;
    color: ${colors.ink};
    max-width: 140mm;
    line-height: 1.5;
  }
  .badge-list {
    margin-top: 12mm;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4mm;
  }
  .badge-row {
    display: flex;
    align-items: center;
    gap: 3mm;
    font-weight: 700;
    font-size: 5mm;
    color: ${colors.ink};
  }
  .badge-row svg { width: 6mm; height: 6mm; flex-shrink: 0; }
  .issued {
    margin-top: auto;
    padding-top: 14mm;
    font-size: 4mm;
    color: ${colors.ink};
    opacity: 0.75;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="kicker">Verification Certificate</div>
    <div class="wordmark">${wordmark}</div>
    <div class="business-name">${params.businessName}</div>
    <div class="statement">This certifies that the business named above has completed ServicePros' evidence-based verification process for the badge(s) listed below.</div>
    <ul class="badge-list">${badges}</ul>
    <div class="issued">Issued ${issuedDate()} &middot; servicepros.co.za</div>
  </div>
</body>
</html>`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handlePrintKitPdfRequest(id, {
    size: { widthMm: widthMm + bleedMm * 2, heightMm: heightMm + bleedMm * 2 },
    filenameSuffix: 'servicepros-certificate-a4',
    buildHtml,
  })
}
