import { handlePrintKitPdfRequest } from '@/lib/print-kit/route-handler'
import { renderStickerPdf } from '@/lib/print-kit/render'
import { PRINT_KIT_STICKER_CIRCULAR } from '@/lib/print-kit-config'

export const runtime = 'nodejs'
export const maxDuration = 60

const { diameterMm, bleedMm } = PRINT_KIT_STICKER_CIRCULAR

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handlePrintKitPdfRequest(id, {
    size: { widthMm: diameterMm + bleedMm * 2, heightMm: diameterMm + bleedMm * 2 },
    filenameSuffix: 'servicepros-sticker-60mm',
    qrSource: 'qr_sticker',
    renderPdf: renderStickerPdf,
    qrSize: 260,
  })
}
