import { handlePrintKitPdfRequest } from '@/lib/print-kit/route-handler'
import { renderDecalPdf } from '@/lib/print-kit/render'
import { PRINT_KIT_DECAL_A5 } from '@/lib/print-kit-config'

export const runtime = 'nodejs'
export const maxDuration = 60

const { widthMm, heightMm, bleedMm } = PRINT_KIT_DECAL_A5

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handlePrintKitPdfRequest(id, {
    size: { widthMm: widthMm + bleedMm * 2, heightMm: heightMm + bleedMm * 2 },
    filenameSuffix: 'servicepros-decal-a5',
    renderPdf: renderDecalPdf,
  })
}
