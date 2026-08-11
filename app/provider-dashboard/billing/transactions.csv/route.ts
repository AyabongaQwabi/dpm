import { NextResponse } from 'next/server'
import { requireProviderSession } from '@/lib/session'
import { getProviderWalletSnapshot } from '@/lib/actions/provider-wallet'

function csvCell(value: string | number | null): string {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: Request) {
  const { provider } = await requireProviderSession()
  const url = new URL(request.url)
  const page = Math.max(1, Math.round(Number(url.searchParams.get('page'))) || 1)
  const pageSize = Math.max(1, Math.min(100, Math.round(Number(url.searchParams.get('pageSize'))) || 10))
  const wallet = await getProviderWalletSnapshot(provider.id, { page, pageSize })

  const rows = [
    ['Date', 'Type', 'Amount', 'Reference type', 'Reference id', 'Running balance', 'Yoco ref', 'Notes'],
    ...wallet.transactions.map((tx) => [
      tx.created_at,
      tx.type,
      tx.amount,
      tx.reference_type,
      tx.reference_id,
      tx.balance_after,
      tx.yoco_ref,
      tx.notes,
    ]),
  ]

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="provider-wallet-transactions-page-${wallet.page}.csv"`,
    },
  })
}
