import { handlePrintKitPdfRequest } from '@/lib/print-kit/route-handler'
import { renderCertificatePdf } from '@/lib/print-kit/render'
import { PRINT_KIT_CERTIFICATE_A4 } from '@/lib/print-kit-config'

export const runtime = 'nodejs'
export const maxDuration = 60

const { widthMm, heightMm, bleedMm } = PRINT_KIT_CERTIFICATE_A4

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return handlePrintKitPdfRequest(id, {
    size: { widthMm: widthMm + bleedMm * 2, heightMm: heightMm + bleedMm * 2 },
    filenameSuffix: 'servicepros-certificate-a4',
    renderPdf: renderCertificatePdf,
  })
}
