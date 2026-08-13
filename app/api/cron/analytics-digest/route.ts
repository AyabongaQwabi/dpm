import { NextResponse } from 'next/server'
import {
  enqueueWeeklyAnalyticsDigests,
  processDueAnalyticsDigests,
} from '@/lib/actions/provider-analytics-digest'

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

  const enqueue = await enqueueWeeklyAnalyticsDigests()
  const send = await processDueAnalyticsDigests()
  return NextResponse.json({ enqueue, send })
}
