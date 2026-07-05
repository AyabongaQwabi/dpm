import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAndApplyCredits } from '@/lib/payments/verify-credits'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_provider_id', user.id)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  let body: { reference?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
  }

  const result = await verifyAndApplyCredits(reference, customer.id)

  return NextResponse.json({
    credited: result.credited,
    balance: result.balance,
  })
}
