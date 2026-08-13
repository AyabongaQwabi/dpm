import { handlePrintKitPdfRequest } from '@/lib/print-kit/route-handler'
import { PRINT_KIT_STICKER_CIRCULAR, PRINT_KIT_COLORS, PRINT_KIT_WORDMARK } from '@/lib/print-kit-config'

export const runtime = 'nodejs'
export const maxDuration = 60

const { diameterMm, bleedMm } = PRINT_KIT_STICKER_CIRCULAR
const colors = PRINT_KIT_COLORS
const wordmark = PRINT_KIT_WORDMARK

function buildHtml(params: { businessName: string; qr: string | null; fontCss: string }): string {
  const pageSize = diameterMm + bleedMm * 2

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  ${params.fontCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: ${pageSize}mm ${pageSize}mm; margin: 0; }
  body {
    width: ${pageSize}mm;
    height: ${pageSize}mm;
    background: ${colors.paper};
    font-family: 'Hanken Grotesk', Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .disc {
    width: ${diameterMm}mm;
    height: ${diameterMm}mm;
    border-radius: 50%;
    background: #fff;
    border: 1.2mm solid ${colors.primary};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4mm;
  }
  .wordmark {
    font-family: 'Bricolage Grotesque', Arial, sans-serif;
    font-weight: 800;
    font-size: 3.4mm;
    color: ${colors.primary};
    line-height: 1.1;
  }
  .qr {
    margin-top: 1.5mm;
    width: 24mm;
    height: 24mm;
  }
  .business-name {
    margin-top: 1.5mm;
    font-weight: 700;
    font-size: 2.6mm;
    color: ${colors.ink};
    line-height: 1.1;
    max-width: 40mm;
  }
</style>
</head>
<body>
  <div class="disc">
    <div class="wordmark">${wordmark}</div>
    ${params.qr ? `<img class="qr" src="${params.qr}" alt="" />` : ''}
    <div class="business-name">${params.businessName}</div>
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
    size: { widthMm: diameterMm + bleedMm * 2, heightMm: diameterMm + bleedMm * 2 },
    filenameSuffix: 'servicepros-sticker-60mm',
    buildHtml,
    qrSize: 260,
  })
}
