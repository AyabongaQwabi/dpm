#!/usr/bin/env node

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const env = {}
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return env
}

function arg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function money(value) {
  return `R${Math.round(Number(value ?? 0)).toLocaleString('en-ZA')}`
}

const env = loadEnv()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const markPaidId = arg('--mark-paid')
const note = arg('--note')

if (markPaidId) {
  const { data, error } = await supabase
    .from('provider_payout_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      admin_note: note ?? 'Marked paid by admin script',
    })
    .eq('id', markPaidId)
    .eq('status', 'processing')
    .select('id, amount, provider_id')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    console.log(`No processing payout request found for ${markPaidId}.`)
    process.exit(1)
  }

  console.log(`Marked payout ${data.id} as paid (${money(data.amount)}).`)
  process.exit(0)
}

const { data, error } = await supabase
  .from('provider_payout_requests')
  .select(`
    id, amount, status, method, name_on_account, bank_name, account_type,
    account_number, branch_code, payshap_cellphone, provider_note, requested_at,
    provider:providers!provider_payout_requests_provider_id_fkey(id, business_name)
  `)
  .eq('status', 'processing')
  .order('requested_at', { ascending: true })

if (error) throw error

if (!data?.length) {
  console.log('No processing payout requests.')
  process.exit(0)
}

for (const request of data) {
  const provider = Array.isArray(request.provider) ? request.provider[0] : request.provider
  console.log('\n---')
  console.log(`Request: ${request.id}`)
  console.log(`Provider: ${provider?.business_name ?? request.provider_id}`)
  console.log(`Amount:   ${money(request.amount)}`)
  console.log(`Method:   ${request.method === 'payshap' ? 'PayShap' : 'Bank account'}`)
  console.log(`Name:     ${request.name_on_account}`)
  console.log(`Bank:     ${request.bank_name}`)
  if (request.method === 'payshap') {
    console.log(`Cell:     ${request.payshap_cellphone}`)
  } else {
    console.log(`Type:     ${request.account_type}`)
    console.log(`Account:  ${request.account_number}`)
    console.log(`Branch:   ${request.branch_code}`)
  }
  if (request.provider_note) console.log(`Note:     ${request.provider_note}`)
  console.log(`Requested ${new Date(request.requested_at).toLocaleString('en-ZA')}`)
}

console.log('\nMark paid with:')
console.log('node scripts/admin-provider-payouts.mjs --mark-paid <request_id> --note "Paid via EFT"')
