// Deletes all providers imported from the Google Places scraper
// (scripts/scrape-businesses.mjs), identified by providers.is_scraped = true.
// Leaves provider_categories, provider_types, and all non-scraped providers
// (manually seeded via seed-*.mjs or real sign-ups) untouched.
//
// Run:
//   node scripts/destroy-scraped-places-seed.mjs

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

async function main() {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, slug')
    .eq('is_scraped', true)
  if (error) throw error

  const providerIds = (providers ?? []).map((p) => p.id)

  if (providerIds.length === 0) {
    console.log('No scraped place providers found.')
    return
  }

  const { data: services } = await supabase.from('services').select('id').in('provider_id', providerIds)
  const serviceIds = (services ?? []).map((s) => s.id)

  const { data: threads } = await supabase.from('message_threads').select('id').in('provider_id', providerIds)
  const threadIds = (threads ?? []).map((t) => t.id)

  if (threadIds.length > 0) {
    await supabase.from('messages').delete().in('thread_id', threadIds)
  }
  await supabase.from('content_posts').delete().in('provider_id', providerIds)
  await supabase.from('message_threads').delete().in('provider_id', providerIds)
  if (serviceIds.length > 0) {
    await supabase.from('service_sale_prices').delete().in('service_id', serviceIds)
    await supabase.from('service_packages').delete().in('service_id', serviceIds)
  }
  await supabase.from('reviews').delete().in('provider_id', providerIds)
  await supabase.from('bookings').delete().in('provider_id', providerIds)
  await supabase.from('services').delete().in('provider_id', providerIds)
  await supabase.from('provider_tags').delete().in('provider_id', providerIds)
  await supabase.from('provider_field_values').delete().in('provider_id', providerIds)
  await supabase.from('providers').delete().in('id', providerIds)

  console.log(`Destroyed ${providerIds.length} scraped place providers (categories and subcategories left intact).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
