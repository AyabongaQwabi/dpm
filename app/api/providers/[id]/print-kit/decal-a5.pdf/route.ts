import { handlePrintKitPdfRequest } from '@/lib/print-kit/route-handler'
import { badgeChipsHtml } from '@/lib/print-kit/badges'
import { PRINT_KIT_DECAL_A5, PRINT_KIT_COLORS, PRINT_KIT_WORDMARK } from '@/lib/print-kit-config'

export const runtime = 'nodejs'
export const maxDuration = 60

const { widthMm, heightMm, bleedMm } = PRINT_KIT_DECAL_A5
const colors = PRINT_KIT_COLORS
const wordmark = PRINT_KIT_WORDMARK

function buildHtml(params: { businessName: string; tiers: Parameters<typeof badgeChipsHtml>[0]; qr: string | null; fontCss: string }): string {
  const pageW = widthMm + bleedMm * 2
  const pageH = heightMm + bleedMm * 2
  const badges = badgeChipsHtml(params.tiers, colors.ink)

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
  .card {
    width: ${widthMm}mm;
    height: ${heightMm}mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 12mm 8mm;
    border: 2mm solid ${colors.primary};
    border-radius: 6mm;
    background: #fff;
    text-align: center;
  }
  .wordmark {
    font-family: 'Bricolage Grotesque', Arial, sans-serif;
    font-weight: 800;
    font-size: 8mm;
    color: ${colors.primary};
    line-height: 1.1;
  }
  .subline {
    margin-top: 3mm;
    font-weight: 700;
    font-size: 4mm;
    color: ${colors.accent};
  }
  .qr {
    margin-top: 8mm;
    width: 48mm;
    height: 48mm;
  }
  .business-name {
    margin-top: 8mm;
    font-family: 'Bricolage Grotesque', Arial, sans-serif;
    font-weight: 800;
    font-size: 6mm;
    color: ${colors.ink};
    line-height: 1.15;
  }
  .badges {
    margin-top: 6mm;
    display: flex;
    flex-wrap: wrap;
    gap: 2mm;
    justify-content: center;
  }
  .badge-chip {
    display: flex;
    align-items: center;
    gap: 1.2mm;
    padding: 1.5mm 3mm;
    border-radius: 20mm;
    border: 0.4mm solid ${colors.ink};
    font-weight: 700;
    font-size: 3.2mm;
    color: ${colors.ink};
  }
  .badge-chip svg { width: 3.6mm; height: 3.6mm; }
</style>
</head>
<body>
  <div class="card">
    <div class="wordmark">${wordmark}</div>
    <div class="subline">Scan to view &amp; book</div>
    ${params.qr ? `<img class="qr" src="${params.qr}" alt="" />` : ''}
    <div class="business-name">${params.businessName}</div>
    <div class="badges">${badges}</div>
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
    filenameSuffix: 'servicepros-decal-a5',
    buildHtml,
  })
}
