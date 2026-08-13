import { NextResponse } from 'next/server'
import { submitNpsResponse } from '@/lib/actions/nps'

function stringValue(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const token = stringValue(body.token, 80)
  const score = Number(body.score)
  if (!token || !Number.isInteger(score)) {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const result = await submitNpsResponse({
    token,
    score,
    verbatim: stringValue(body.verbatim, 2000),
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
