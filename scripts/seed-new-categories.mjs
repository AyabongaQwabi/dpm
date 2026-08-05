// Seeds providers, services, packages, reviews, FAQs, and posts for the
// Phase 1 categories added in 20260723000000_new_categories.sql:
// funeral, dealerships, construction, gardening.
//
// Mirrors the pattern in seed-public-iteration.mjs (upsert on deterministic
// seed-* ids), kept as a separate script since it targets categories that
// migration didn't exist for at the time that script was written.
//
// Run:
//   node scripts/seed-new-categories.mjs
// Reverse:
//   node scripts/destroy-new-categories-seed.mjs

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

const cities = ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Stellenbosch', 'Sandton']

const images = {
  funeral: [
    'https://images.pexels.com/photos/6120207/pexels-photo-6120207.jpeg',
    'https://images.pexels.com/photos/8817716/pexels-photo-8817716.jpeg',
    'https://images.pexels.com/photos/3959074/pexels-photo-3959074.jpeg',
  ],
  dealerships: [
    'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg',
    'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg',
    'https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg',
  ],
  construction: [
    'https://images.pexels.com/photos/259966/pexels-photo-259966.jpeg',
    'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg',
    'https://images.pexels.com/photos/585419/pexels-photo-585419.jpeg',
  ],
  gardening: [
    'https://images.pexels.com/photos/589/garden-grass-meadow-lawn.jpg',
    'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg',
    'https://images.pexels.com/photos/2749165/pexels-photo-2749165.jpeg',
  ],
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
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
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Professional, punctual service from a verified South African provider.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'All equipment and materials supplied unless otherwise stated.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Post-service follow-up available on request.' }] }] },
        ],
      },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'About ' + providerName }] },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `${providerName} is a trusted South African provider with a strong track record. Browse reviews below to see what past clients say about working with us.` }],
      },
    ],
  }
}

function makeProvider(group, index, typeId, name, tags) {
  const city = cities[index % cities.length]
  const gallery = images[group]
  const slug = slugify(name)
  return {
    id: `seed-provider-${slug}`,
    provider_type_id: typeId,
    business_name: name,
    slug,
    bio: `${name} is a seeded ${group} services provider profile with realistic services, gallery media, reviews, FAQs, and recent posts for marketplace testing in ${city}.`,
    profile_image: gallery[index % gallery.length],
    gallery,
    faqs: [
      { question: 'Do you offer custom quotes?', answer: 'Yes. Customers can request a quote based on location, timing, and service scope.' },
      { question: 'Can I see examples of past work?', answer: 'Yes. The gallery and recent posts show representative seeded work samples.' },
    ],
    links: [{ label: 'Website', url: `https://example.com/${slug}` }],
    social_links: [
      { platform: 'Instagram', url: `https://instagram.com/${slug}` },
      { platform: 'Facebook', url: `https://facebook.com/${slug}` },
    ],
    languages: ['English', index % 2 === 0 ? 'Zulu' : 'Afrikaans'],
    portfolio: [
      { title: 'Featured project', description: 'A sample of our best recent work.', image_url: gallery[0] },
      { title: 'Client showcase', description: 'Delivered on time and within budget.', image_url: gallery[1] },
    ],
    location_city: city,
    location_state: city === 'Cape Town' || city === 'Stellenbosch' ? 'Western Cape' : 'Gauteng',
    location_country: 'ZA',
    is_featured: index % 4 === 0,
    is_seed: true,
    is_published: true,
    tags,
  }
}

const providers = [
  // ---- Funeral Services (brackets: 3, 4, 5) ----
  makeProvider('funeral', 0, 'pt-funeral-parlour', 'Ubuntu Funeral Services', ['funeral', 'parlour', 'durban']),
  makeProvider('funeral', 1, 'pt-tombstone', 'Legacy Memorials', ['funeral', 'tombstones', 'sandton']),
  makeProvider('funeral', 2, 'pt-cremation', 'Peaceful Passing Cremations', ['funeral', 'cremation', 'cape-town']),

  // ---- Car Dealerships (brackets: 3, 4, 5) ----
  makeProvider('dealerships', 0, 'pt-used-car-dealer', 'Khanyisa Motors', ['dealerships', 'used-cars', 'johannesburg']),
  makeProvider('dealerships', 1, 'pt-new-car-dealer', 'Highveld Auto Traders', ['dealerships', 'new-cars', 'pretoria']),
  makeProvider('dealerships', 2, 'pt-bakkie-dealer', 'Coastal Bakkie Traders', ['dealerships', 'bakkies', 'stellenbosch']),

  // ---- Construction & Civil (brackets: 2, 4, 5) ----
  makeProvider('construction', 0, 'pt-building-contractor', 'Sandton Build Collective', ['construction', 'builds', 'sandton']),
  makeProvider('construction', 1, 'pt-renovation', 'Protea Renovations', ['construction', 'renovations', 'durban']),
  makeProvider('construction', 2, 'pt-paving', 'Themba Civil Works', ['construction', 'paving', 'johannesburg']),

  // ---- Gardening & Landscaping (brackets: 1, 2, 3) ----
  makeProvider('gardening', 0, 'pt-garden-services', 'Green Acres Garden Care', ['gardening', 'maintenance', 'cape-town']),
  makeProvider('gardening', 1, 'pt-landscaping', 'Fynbos Landscaping Co', ['gardening', 'landscaping', 'stellenbosch']),
  makeProvider('gardening', 2, 'pt-irrigation', 'Highveld Irrigation Solutions', ['gardening', 'irrigation', 'pretoria']),
]

// Explicit per-provider service + package price spread, deliberately
// covering different commission brackets (≤999 / ≤4999 / ≤9999 / ≤49999 / 50000+).
const serviceDefs = {
  'ubuntu-funeral-services': [
    { title: 'Basic dignity funeral package', price: 4500, tier: 'bracket2' },
    { title: 'Standard funeral package', price: 18000, tier: 'bracket4' },
    { title: 'Premium funeral package', price: 48000, tier: 'bracket4' },
  ],
  'legacy-memorials': [
    { title: 'Cremation service', price: 7500, tier: 'bracket3' },
    { title: 'Granite tombstone', price: 22000, tier: 'bracket4' },
  ],
  'peaceful-passing-cremations': [
    { title: 'Standard cremation service', price: 7500, tier: 'bracket3' },
    { title: 'Premium funeral package with repatriation', price: 60000, tier: 'bracket5' },
  ],
  'khanyisa-motors': [
    { title: 'Vehicle sourcing fee', price: 2500, tier: 'bracket2' },
    { title: 'Used hatchback', price: 135000, tier: 'bracket5' },
  ],
  'highveld-auto-traders': [
    { title: 'Trade-in valuation & sourcing fee', price: 3200, tier: 'bracket2' },
    { title: 'Used bakkie', price: 320000, tier: 'bracket5' },
  ],
  'coastal-bakkie-traders': [
    { title: 'Vehicle sourcing fee', price: 2800, tier: 'bracket2' },
    { title: 'Used bakkie, commercial spec', price: 285000, tier: 'bracket5' },
  ],
  'sandton-build-collective': [
    { title: 'Small renovation project', price: 45000, tier: 'bracket4' },
    { title: 'New build, medium residential', price: 850000, tier: 'bracket5' },
  ],
  'protea-renovations': [
    { title: 'Bathroom renovation', price: 32000, tier: 'bracket4' },
    { title: 'Full home renovation', price: 220000, tier: 'bracket5' },
  ],
  'themba-civil-works': [
    { title: 'Driveway paving, standard', price: 8500, tier: 'bracket3' },
    { title: 'Large-scale paving & civil works', price: 65000, tier: 'bracket5' },
  ],
  'green-acres-garden-care': [
    { title: 'Once-off garden clean-up', price: 850, tier: 'bracket1' },
    { title: 'Monthly garden maintenance plan', price: 2200, tier: 'bracket2' },
  ],
  'fynbos-landscaping-co': [
    { title: 'Garden clean-up & tidy', price: 950, tier: 'bracket1' },
    { title: 'Landscaping design & installation', price: 8800, tier: 'bracket3' },
  ],
  'highveld-irrigation-solutions': [
    { title: 'Irrigation system inspection', price: 750, tier: 'bracket1' },
    { title: 'Full irrigation system installation', price: 9200, tier: 'bracket3' },
  ],
}

async function upsert(table, rows, options = {}) {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows, options)
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function main() {
  await upsert('providers', providers.map((p) => {
    const row = { ...p }
    delete row.tags
    return row
  }), { onConflict: 'id' })

  const tagNames = [...new Set(providers.flatMap((p) => p.tags))]
  const tags = tagNames.map((name) => ({ id: `seed-tag-${slugify(name)}`, name, is_seed: true }))
  await upsert('tags', tags, { onConflict: 'id' })

  await supabase.from('provider_tags').delete().in('provider_id', providers.map((p) => p.id))
  const providerTags = providers.flatMap((p) =>
    p.tags.map((tag) => ({ provider_id: p.id, tag_id: `seed-tag-${slugify(tag)}` })),
  )
  await upsert('provider_tags', providerTags)

  // Services — 2-3 realistic services per provider with deliberate bracket spread.
  const services = providers.flatMap((p) => {
    const defs = serviceDefs[p.slug]
    return defs.map((def, i) => ({
      id: `seed-service-${p.slug}-${i}`,
      provider_id: p.id,
      title: def.title,
      description: `${def.title} from ${p.business_name}.`,
      price: def.price,
      discount_type: 'none',
      discount_amount: null,
      image: p.gallery[i % p.gallery.length],
      article_json: makeArticleJson(
        def.title,
        `${def.title} from ${p.business_name}. We bring professional expertise to every engagement.`,
        p.business_name,
      ),
      article_text: `${def.title} from ${p.business_name}. We bring professional expertise to every engagement.`,
      service_type: 'fixed_deliverable',
      is_published: true,
      is_seed: true,
    }))
  })
  await upsert('services', services, { onConflict: 'id' })

  // Packages — one default package per service, matching the service price.
  const packages = services.map((s) => ({
    id: `seed-pkg-${s.id}-single`,
    service_id: s.id,
    name: 'Standard',
    description: 'Our most popular offering, suitable for most clients.',
    price: s.price,
    discount_type: 'none',
    discount_amount: null,
    offerings: ['Full service as described', 'Materials included', 'Post-service follow-up'],
    requirements: 'Please confirm your address and preferred date at least 3 days ahead.',
    requirement_file_slots: [],
    delivery_time: '3-5 business days',
    is_default: true,
    display_order: 0,
  }))
  await upsert('service_packages', packages, { onConflict: 'id' })

  // Customers
  const customers = providers.flatMap((p, index) => [1, 2].map((n) => ({
    id: `seed-customer-${p.slug}-${n}`,
    email: `seed-${p.slug}-${n}@example.com`,
    name: ['Amina Jacobs', 'Thabo Mokoena', 'Sarah Naidoo', 'Lerato Dlamini'][(index + n) % 4],
    phone: `+2700001${String(index).padStart(2, '0')}${n}`,
  })))
  await upsert('customers', customers, { onConflict: 'id' })

  // Bookings — 2 per provider, referencing the provider's first two services.
  const bookings = providers.flatMap((p, index) => {
    const defs = serviceDefs[p.slug]
    return [1, 2].map((n) => {
      const svcIndex = (n - 1) % defs.length
      const serviceId = `seed-service-${p.slug}-${svcIndex}`
      return {
        id: `seed-booking-${p.slug}-${n}`,
        provider_id: p.id,
        customer_id: `seed-customer-${p.slug}-${n}`,
        service_id: serviceId,
        status: 'completed',
        payment_status: 'captured',
        final_price: defs[svcIndex].price,
        commission_amount: Math.round(defs[svcIndex].price * 0.08),
        provider_payout_amount: Math.round(defs[svcIndex].price * 0.92),
        _default_pkg_id: `seed-pkg-${serviceId}-single`,
        _service_index: svcIndex,
        _index: index,
      }
    })
  })
  await upsert('bookings', bookings.map(({ _default_pkg_id, _service_index, _index, ...b }) => b), { onConflict: 'id' })

  // Reviews — 2 per provider, alternating 4/5 rating (avg 4.5).
  const reviews = bookings.map((booking, index) => ({
    id: `seed-review-${booking.id}`,
    booking_id: booking.id,
    service_id: booking.service_id,
    package_id: booking._default_pkg_id,
    provider_id: booking.provider_id,
    customer_id: booking.customer_id,
    rating: 4 + (index % 2),
    comment: index % 2
      ? 'Professional, clear communication, and the service matched what was described in the article.'
      : 'Great experience. The package breakdown helped us choose the right tier with confidence.',
    is_seed: true,
  }))
  await upsert('reviews', reviews, { onConflict: 'id' })

  // Content posts — 2 per provider (tip + social/promo).
  const posts = providers.flatMap((p, index) => [
    {
      id: `seed-post-${p.slug}-tip`,
      provider_id: p.id,
      image_url: p.gallery[2],
      body: `Tip from ${p.business_name}: ask about scope, timing, and materials before confirming a booking.`,
      post_type: 'tip',
      is_seed: true,
    },
    {
      id: `seed-post-${p.slug}-update`,
      provider_id: p.id,
      image_url: p.gallery[index % p.gallery.length],
      body: `Recent update from ${p.business_name}, showing how social-style provider content appears in the feed.`,
      post_type: index % 3 === 0 ? 'promo' : 'social',
      is_seed: true,
    },
  ])
  await upsert('content_posts', posts, { onConflict: 'id' })

  // Message thread + messages per booking so Messages section has data.
  const threads = bookings.map((booking) => ({
    id: `seed-thread-${booking.id}`,
    provider_id: booking.provider_id,
    customer_id: booking.customer_id,
    service_id: booking.service_id,
    booking_id: booking.id,
  }))
  await upsert('message_threads', threads, { onConflict: 'id' })

  const messages = threads.flatMap((thread) => [
    {
      id: `seed-msg-${thread.id}-1`,
      thread_id: thread.id,
      actor: 'customer',
      body: 'Hi, just confirming our booking details. Looking forward to working with you!',
    },
    {
      id: `seed-msg-${thread.id}-2`,
      thread_id: thread.id,
      actor: 'provider',
      body: 'Great to hear from you! Everything is confirmed. I\'ll be in touch closer to the date.',
    },
  ])
  await upsert('messages', messages, { onConflict: 'id' })

  // service_sale_prices — mirrors the 5 price-change bands from seed-public-iteration.mjs.
  const salePriceMultipliers = [1.0, 1.07, 1.15, 1.35, 1.60]
  const salePriceRows = bookings.flatMap((booking, index) => {
    const basePrice = booking.final_price ?? 850
    return salePriceMultipliers.map((mult, bandIndex) => ({
      id: `seed-sale-price-${booking.id}-band${bandIndex + 1}`,
      service_id: booking.service_id,
      package_id: booking._default_pkg_id,
      booking_id: booking.id,
      sale_price: Math.round(basePrice * mult * 100) / 100,
      sold_at: new Date(Date.now() - (bandIndex + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  })
  await upsert('service_sale_prices', salePriceRows, { onConflict: 'id' })

  console.log(
    `Seeded ${providers.length} providers across 4 new categories, ${services.length} services, ` +
    `${packages.length} packages, ${reviews.length} reviews, ${threads.length} message threads, ` +
    `${posts.length} posts, and ${salePriceRows.length} sale price history rows.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
