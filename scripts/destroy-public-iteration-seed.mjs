import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: providers, error } = await supabase.from('providers').select('id, slug').eq('is_seed', true)
  if (error) throw error

  const providerIds = (providers ?? []).map((provider) => provider.id)
  const slugs = (providers ?? []).map((provider) => provider.slug).filter(Boolean)

  if (providerIds.length === 0) {
    console.log('No public iteration seed providers found.')
    return
  }

  await supabase.from('content_posts').delete().in('provider_id', providerIds)
  await supabase.from('messages').delete().in('thread_id', providerIds.flatMap((id) => [`seed-thread-seed-booking-${id.replace('seed-provider-', '')}-1`, `seed-thread-seed-booking-${id.replace('seed-provider-', '')}-2`]))
  await supabase.from('message_threads').delete().in('provider_id', providerIds)
  await supabase.from('reviews').delete().in('provider_id', providerIds)
  await supabase.from('bookings').delete().in('provider_id', providerIds)
  await supabase.from('service_packages').delete().in('service_id',
    (await supabase.from('services').select('id').in('provider_id', providerIds)).data?.map((s) => s.id) ?? []
  )
  await supabase.from('services').delete().in('provider_id', providerIds)
  await supabase.from('provider_tags').delete().in('provider_id', providerIds)
  await supabase.from('providers').delete().in('id', providerIds)

  if (slugs.length > 0) {
    await supabase.from('customers').delete().in('id', slugs.flatMap((slug) => [`seed-customer-${slug}-1`, `seed-customer-${slug}-2`]))
  }

  await supabase.from('tags').delete().eq('is_seed', true)

  console.log(`Destroyed public iteration seed data for ${providerIds.length} providers.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
