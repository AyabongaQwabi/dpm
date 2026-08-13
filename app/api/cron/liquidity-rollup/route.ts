import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeLiquidityCells } from '@/lib/liquidity/cell-stats'

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

  const cells = await computeLiquidityCells()
  if (cells.length === 0) {
    return NextResponse.json({ cellsWritten: 0 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('liquidity_cell_snapshots').insert(
    cells.map((cell) => ({
      category: cell.category,
      city: cell.city,
      provider_count: cell.providerCount,
      completed_bookings_30d: cell.completedBookings30d,
      response_rate_24h: cell.responseRate24h,
      median_response_minutes: cell.medianResponseMinutes,
      search_performed_count: cell.searchPerformedCount,
      service_viewed_count: cell.serviceViewedCount,
      booking_started_count: cell.bookingStartedCount,
      booking_completed_count: cell.bookingCompletedCount,
      is_liquid: cell.isLiquid,
    })),
  )

  if (error) {
    console.error('liquidity rollup insert failed:', error.message)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ cellsWritten: cells.length })
}
