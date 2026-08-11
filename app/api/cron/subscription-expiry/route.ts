import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendSubscriptionExpiryEmail,
  sendSubscriptionRenewalReminderEmail,
} from '@/lib/email/resend'
import { getProviderAuthEmail } from '@/lib/payments/verify-subscription'
import { lapseExpiredMemberships } from '@/lib/actions/pro-membership'
import { recheckSponsoredEligibility } from '@/lib/actions/sponsored'
import { SITE_URL } from '@/lib/seo'

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

  const admin = createAdminClient()
  const now = new Date()
  let expired = 0
  let reminded = 0

  const { data: toExpire } = await admin
    .from('provider_subscriptions')
    .select('id, provider_id, billing_end')
    .eq('status', 'active')
    .lt('billing_end', now.toISOString())

  for (const sub of toExpire ?? []) {
    await admin
      .from('provider_subscriptions')
      .update({ status: 'expired' })
      .eq('id', sub.id)

    await admin.from('providers').update({ is_published: false }).eq('id', sub.provider_id)

    const { data: provider } = await admin
      .from('providers')
      .select('business_name')
      .eq('id', sub.provider_id)
      .single()

    const email = await getProviderAuthEmail(sub.provider_id)
    if (email && provider?.business_name) {
      await sendSubscriptionExpiryEmail({
        to: email,
        businessName: provider.business_name,
        billingUrl: `${SITE_URL}/provider-dashboard/billing`,
      })
    }

    expired++
  }

  const threeDaysOut = new Date(now)
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)
  const dayStart = new Date(threeDaysOut)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(threeDaysOut)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: toRemind } = await admin
    .from('provider_subscriptions')
    .select('id, provider_id, billing_end, last_reminder_sent_at')
    .eq('status', 'active')
    .gte('billing_end', dayStart.toISOString())
    .lte('billing_end', dayEnd.toISOString())

  for (const sub of toRemind ?? []) {
    if (sub.last_reminder_sent_at) {
      const sent = new Date(sub.last_reminder_sent_at)
      if (sent > new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)) continue
    }

    const { data: provider } = await admin
      .from('providers')
      .select('business_name')
      .eq('id', sub.provider_id)
      .single()

    const email = await getProviderAuthEmail(sub.provider_id)
    if (email && provider?.business_name) {
      await sendSubscriptionRenewalReminderEmail({
        to: email,
        businessName: provider.business_name,
        daysRemaining: 3,
        billingUrl: `${SITE_URL}/provider-dashboard/billing`,
      })
      await admin
        .from('provider_subscriptions')
        .update({ last_reminder_sent_at: now.toISOString() })
        .eq('id', sub.id)
      reminded++
    }
  }

  const membershipsLapsed = await lapseExpiredMemberships()
  const sponsoredRecheck = await recheckSponsoredEligibility()

  return NextResponse.json({ expired, reminded, membershipsLapsed, sponsoredRecheck })
}
