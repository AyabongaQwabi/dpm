// Seeds existing provider records with business-type + verification data so the
// provider cards show a realistic mix of badges (Verified business / Verified
// vendor in different colours, plus some Unverified).
//
// Run manually:
//   node scripts/seed-verification-data.mjs
//
// Verification is layered to mirror reality: FICA implies CIPC implies contact.
// business_type drives the "business" vs "vendor" wording on the card badge
// (company / co_op / non_profit => business; entrepreneur => vendor).

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

// entrepreneur => "Verified vendor" (an individual), the rest => "Verified business".
const BUSINESS_TYPES = ['entrepreneur', 'co_op', 'company', 'non_profit']

// 0: none (Unverified)  1: contact  2: +cipc  3: +fica
function verificationFor(index) {
  const tier = index % 4
  return {
    business_type: BUSINESS_TYPES[index % BUSINESS_TYPES.length],
    verified_contact: tier >= 1,
    verified_cipc: tier >= 2,
    verified_fica: tier >= 3,
  }
}

async function main() {
  // Order by id for a stable, deterministic assignment across re-runs.
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id')
    .order('id', { ascending: true })

  if (error) throw new Error(`fetch providers: ${error.message}`)
  if (!providers || providers.length === 0) {
    console.log('No provider records found. Seed providers first.')
    return
  }

  let updated = 0
  for (let i = 0; i < providers.length; i++) {
    const patch = verificationFor(i)
    const { error: updateError } = await supabase
      .from('providers')
      .update(patch)
      .eq('id', providers[i].id)
    if (updateError) throw new Error(`update ${providers[i].id}: ${updateError.message}`)
    updated++
  }

  console.log(`Updated ${updated} providers with business-type + verification data.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
