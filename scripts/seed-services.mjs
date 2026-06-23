/**
 * Seed script: ensures every published provider has at least two published
 * services, each with a Basic / Standard / Premium pricing package.
 * Safe to run multiple times — upserts on deterministic IDs.
 *
 * Usage:
 *   node scripts/seed-services.mjs
 *   npm run seed:services
 */

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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const serviceImages = [
  'https://images.pexels.com/photos/4107120/pexels-photo-4107120.jpeg',
  'https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg',
  'https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg',
  'https://images.pexels.com/photos/169190/pexels-photo-169190.jpeg',
  'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
  'https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg',
  'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg',
  'https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg',
]

function pickImage(index) {
  return serviceImages[index % serviceImages.length]
}

function makeArticleJson(title, description, providerName) {
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: title }] },
      { type: 'paragraph', content: [{ type: 'text', text: description }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'What to expect' }] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Professional, punctual service from a verified provider.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'All equipment and materials supplied unless stated otherwise.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Clear scope, transparent pricing, and reliable delivery.' }] }] },
        ],
      },
      { type: 'paragraph', content: [{ type: 'text', text: `${providerName} is committed to quality results on every engagement.` }] },
    ],
  }
}

function makePackages(serviceId, basePrice, i) {
  const basic = Math.round(basePrice * 0.65)
  const standard = basePrice
  const premium = Math.round(basePrice * 1.85)
  const hasDiscount = i % 5 === 0

  return [
    {
      id: `seed-svc-pkg-${serviceId}-basic`,
      service_id: serviceId,
      name: 'Basic',
      description: 'Entry-level package covering the essentials.',
      price: basic,
      discount_type: 'none',
      discount_amount: null,
      offerings: JSON.stringify(['Core service delivery', 'Standard materials included']),
      requirements: 'Client to confirm scope at least 48 hours before the service date.',
      requirement_file_slots: JSON.stringify([]),
      delivery_time: '3–5 business days',
      is_default: false,
      display_order: 0,
    },
    {
      id: `seed-svc-pkg-${serviceId}-standard`,
      service_id: serviceId,
      name: 'Standard',
      description: 'Our most popular option — balanced scope and value.',
      price: standard,
      discount_type: hasDiscount ? 'percent' : 'none',
      discount_amount: hasDiscount ? 10 : null,
      offerings: JSON.stringify([
        'Full service as described',
        'Premium materials included',
        'Same-week scheduling available',
        'Post-service follow-up',
      ]),
      requirements: 'Please confirm your address and preferred date before booking.',
      requirement_file_slots: JSON.stringify([]),
      delivery_time: '1–2 business days',
      is_default: true,
      display_order: 1,
    },
    {
      id: `seed-svc-pkg-${serviceId}-premium`,
      service_id: serviceId,
      name: 'Premium',
      description: 'Maximum scope, priority scheduling, and dedicated support.',
      price: premium,
      discount_type: 'none',
      discount_amount: null,
      offerings: JSON.stringify([
        'Extended service hours',
        'All materials and equipment included',
        'Priority same-day scheduling',
        'Dedicated account manager',
        'Satisfaction guarantee',
      ]),
      requirements: 'A brief consultation call is required before booking this tier.',
      requirement_file_slots: JSON.stringify([]),
      delivery_time: 'Next business day',
      is_default: false,
      display_order: 2,
    },
  ]
}

async function upsert(table, rows, options = {}) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows, options)
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function main() {
  // Fetch all published providers
  const { data: providers, error: providerErr } = await supabase
    .from('providers')
    .select('id, business_name, slug')
    .eq('is_published', true)

  if (providerErr) throw new Error(`providers: ${providerErr.message}`)
  if (!providers || providers.length === 0) {
    console.log('No published providers found. Run seed:public first.')
    return
  }

  console.log(`Found ${providers.length} published providers.`)

  // Find providers who have no published services
  const { data: existingServices } = await supabase
    .from('services')
    .select('id, provider_id')
    .eq('is_published', true)

  const coveredProviderIds = new Set((existingServices ?? []).map((s) => s.provider_id))
  const uncovered = providers.filter((p) => !coveredProviderIds.has(p.id))

  if (uncovered.length === 0) {
    console.log('All published providers already have at least one published service. Nothing to seed.')
    return
  }

  console.log(`Seeding services + packages for ${uncovered.length} providers…`)

  const serviceTitles = [
    ['Standard service package', 'Premium package'],
    ['Initial consultation', 'Full engagement'],
    ['Starter offering', 'Comprehensive solution'],
    ['Entry package', 'Professional package'],
  ]

  const services = uncovered.flatMap((provider, i) => {
    const slug = provider.slug ?? slugify(provider.business_name)
    const titles = serviceTitles[i % serviceTitles.length]
    const basePrice = 650 + (i % 8) * 180

    return titles.map((title, j) => {
      const price = j === 0 ? basePrice : Math.round(basePrice * 1.8)
      const description = `${title} delivered by ${provider.business_name}. Professional service with clear scope, transparent pricing, and reliable delivery.`
      return {
        id: `seed-svc-${slug}-${j}`,
        provider_id: provider.id,
        title,
        description,
        price,
        discount_type: 'none',
        discount_amount: null,
        image: pickImage(i + j),
        article_json: makeArticleJson(title, description, provider.business_name),
        article_text: description,
        service_type: 'fixed_deliverable',
        is_published: true,
        is_seed: true,
      }
    })
  })

  await upsert('services', services, { onConflict: 'id' })

  // Build packages for every seeded service
  const allPackages = uncovered.flatMap((provider, i) => {
    const slug = provider.slug ?? slugify(provider.business_name)
    const titles = serviceTitles[i % serviceTitles.length]
    const basePrice = 650 + (i % 8) * 180
    return titles.flatMap((_, j) => {
      const serviceId = `seed-svc-${slug}-${j}`
      const price = j === 0 ? basePrice : Math.round(basePrice * 1.8)
      return makePackages(serviceId, price, i + j)
    })
  })

  await upsert('service_packages', allPackages, { onConflict: 'id' })

  console.log(`Seeded ${services.length} services and ${allPackages.length} packages across ${uncovered.length} providers.`)
  console.log(`${coveredProviderIds.size} providers already had services — left untouched.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
