// Reverses seed-new-categories.mjs — deletes only the rows it created,
// identified by the deterministic seed-provider-* ids for the 12 new-category
// providers. Mirrors destroy-public-iteration-seed.mjs.

import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './load-env.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const NEW_CATEGORY_PROVIDER_SLUGS = [
  'ubuntu-funeral-services',
  'legacy-memorials',
  'peaceful-passing-cremations',
  'khanyisa-motors',
  'highveld-auto-traders',
  'coastal-bakkie-traders',
  'sandton-build-collective',
  'protea-renovations',
  'themba-civil-works',
  'green-acres-garden-care',
  'fynbos-landscaping-co',
  'highveld-irrigation-solutions',
]

async function main() {
  const providerIds = NEW_CATEGORY_PROVIDER_SLUGS.map((slug) => `seed-provider-${slug}`)

  const { data: services } = await supabase.from('services').select('id').in('provider_id', providerIds)
  const serviceIds = (services ?? []).map((s) => s.id)

  await supabase.from('content_posts').delete().in('provider_id', providerIds)
  await supabase.from('messages').delete().in('thread_id',
    providerIds.flatMap((id) => [`seed-thread-seed-booking-${id.replace('seed-provider-', '')}-1`, `seed-thread-seed-booking-${id.replace('seed-provider-', '')}-2`])
  )
  await supabase.from('message_threads').delete().in('provider_id', providerIds)
  await supabase.from('service_sale_prices').delete().in('service_id', serviceIds)
  await supabase.from('reviews').delete().in('provider_id', providerIds)
  await supabase.from('bookings').delete().in('provider_id', providerIds)
  await supabase.from('service_packages').delete().in('service_id', serviceIds)
  await supabase.from('services').delete().in('provider_id', providerIds)
  await supabase.from('provider_tags').delete().in('provider_id', providerIds)
  await supabase.from('providers').delete().in('id', providerIds)
  await supabase.from('customers').delete().in('id',
    NEW_CATEGORY_PROVIDER_SLUGS.flatMap((slug) => [`seed-customer-${slug}-1`, `seed-customer-${slug}-2`])
  )

  console.log(`Destroyed new-categories seed data for ${providerIds.length} providers.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
