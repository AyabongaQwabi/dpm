import { NextResponse } from 'next/server'
import { enqueueDueProviderNps, processDueNpsSurveys } from '@/lib/actions/nps'

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerEnqueue = await enqueueDueProviderNps()
  const sendResult = await processDueNpsSurveys()

  return NextResponse.json({ providerEnqueue, sendResult })
}
