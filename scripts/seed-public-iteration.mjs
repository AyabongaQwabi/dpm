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
  cleaning: [
    'https://images.pexels.com/photos/4107120/pexels-photo-4107120.jpeg',
    'https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg',
    'https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg',
  ],
  events: [
    'https://images.pexels.com/photos/169190/pexels-photo-169190.jpeg',
    'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
    'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg',
  ],
  legal: [
    'https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg',
    'https://images.pexels.com/photos/8112181/pexels-photo-8112181.jpeg',
    'https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg',
  ],
  other: [
    'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg',
    'https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg',
    'https://images.pexels.com/photos/4145354/pexels-photo-4145354.jpeg',
  ],
}

const categories = [
  { id: 'cat-cleaning', name: 'Cleaning Services', slug: 'cleaning', description: 'Home, office, carpet, garden, and specialist cleaning providers.', icon: 'Sparkles' },
  { id: 'cat-events', name: 'Event Services', slug: 'events', description: 'Photographers, DJs, caterers, planners, decor, and event teams.', icon: 'PartyPopper' },
  { id: 'cat-legal', name: 'Legal Services', slug: 'legal', description: 'Attorneys, conveyancers, labour specialists, and legal advisors.', icon: 'Scale' },
  { id: 'cat-beauty', name: 'Beauty & Wellness', slug: 'beauty', description: 'Wellness, grooming, fitness, and personal care professionals.', icon: 'HeartPulse' },
  { id: 'cat-education', name: 'Tutoring & Education', slug: 'education', description: 'Tutors, coaches, and learning specialists for every stage.', icon: 'GraduationCap' },
  { id: 'cat-media', name: 'Media & Creative', slug: 'media', description: 'Photographers, designers, content teams, and creative studios.', icon: 'Camera' },
  { id: 'cat-pets', name: 'Pet Services', slug: 'pets', description: 'Trusted providers for pets and animal care.', icon: 'BriefcaseBusiness' },
]

const types = [
  { id: 'pt-residential-clean', category_id: 'cat-cleaning', name: 'Residential Cleaning', slug: 'residential-cleaning' },
  { id: 'pt-commercial-clean', category_id: 'cat-cleaning', name: 'Commercial Cleaning', slug: 'commercial-cleaning' },
  { id: 'pt-carpet-clean', category_id: 'cat-cleaning', name: 'Carpet & Upholstery', slug: 'carpet-upholstery' },
  { id: 'pt-event-coord', category_id: 'cat-events', name: 'Event Coordinator', slug: 'event-coordinator' },
  { id: 'pt-photographer', category_id: 'cat-events', name: 'Photographer', slug: 'photographer' },
  { id: 'pt-caterer', category_id: 'cat-events', name: 'Caterer', slug: 'caterer' },
  { id: 'pt-attorney', category_id: 'cat-legal', name: 'Attorney', slug: 'attorney' },
  { id: 'pt-family-lawyer', category_id: 'cat-legal', name: 'Family Law Attorney', slug: 'family-law' },
  { id: 'pt-commercial-lawyer', category_id: 'cat-legal', name: 'Commercial Attorney', slug: 'commercial-law' },
  { id: 'pt-massage', category_id: 'cat-beauty', name: 'Massage Therapist', slug: 'massage' },
  { id: 'pt-personal-trainer', category_id: 'cat-beauty', name: 'Personal Trainer', slug: 'personal-trainer' },
  { id: 'pt-maths-tutor', category_id: 'cat-education', name: 'Maths Tutor', slug: 'maths-tutor' },
  { id: 'pt-photographer-comm', category_id: 'cat-media', name: 'Commercial Photographer', slug: 'commercial-photographer' },
  { id: 'pt-pet-sitter', category_id: 'cat-pets', name: 'Pet Sitter', slug: 'pet-sitter' },
]

function slugify(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function makeArticleJson(title, description, providerName) {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: title }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: description }],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'What to expect' }],
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Professional, punctual service from a verified South African provider.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'All equipment and materials supplied unless otherwise stated.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Post-service follow-up available on request.' }] }] },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'About ' + providerName }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `${providerName} is a trusted South African provider with a strong track record. Browse reviews below to see what past clients say about working with us.` }],
      },
    ],
  }
}

function makeProvider(group, index, typeId, name, tags) {
  const city = cities[index % cities.length]
  const gallery = images[group === 'other' ? 'other' : group]
  const slug = slugify(name)
  return {
    id: `seed-provider-${slug}`,
    provider_type_id: typeId,
    business_name: name,
    slug,
    bio: `${name} is a seeded ${group} provider profile with realistic services, gallery media, reviews, FAQs, and recent posts for marketplace testing in ${city}.`,
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
  ...Array.from({ length: 10 }, (_, i) => makeProvider('cleaning', i, ['pt-residential-clean', 'pt-commercial-clean', 'pt-carpet-clean'][i % 3], ['BrightNest Cleaning', 'FreshWave Maids', 'Urban Shine Co', 'Pristine Office Care', 'EcoSweep Homes', 'Sparkle Squad', 'DeepClean Cape', 'NeatSpace Pros', 'ClearView Cleaning', 'TidyWorks SA'][i], ['cleaning', 'home', i % 2 ? 'weekly' : 'deep-clean'])),
  ...Array.from({ length: 10 }, (_, i) => makeProvider('events', i, ['pt-event-coord', 'pt-photographer', 'pt-caterer'][i % 3], ['Luma Events', 'Golden Hour Photo', 'Feast & Gather', 'Cape Celebration Co', 'Prime Party Crew', 'Velvet Lens Studio', 'TableStory Catering', 'Signal Hill Events', 'Bloom Room Decor', 'Metro Moments'][i], ['events', i % 2 ? 'weddings' : 'corporate', 'weekend'])),
  ...Array.from({ length: 10 }, (_, i) => makeProvider('legal', i, ['pt-attorney', 'pt-family-lawyer', 'pt-commercial-lawyer'][i % 3], ['Maseko Legal', 'CivicLine Attorneys', 'BridgePoint Law', 'Summit Family Law', 'ContractWise Legal', 'Harbour Conveyancing', 'Ndlovu Advisory', 'Northstar Legal', 'PlainSpeak Attorneys', 'Lexora Partners'][i], ['legal', i % 2 ? 'contracts' : 'consultation', 'registered'])),
  makeProvider('other', 0, 'pt-massage', 'CalmPoint Wellness', ['wellness', 'mobile', 'weekend']),
  makeProvider('other', 1, 'pt-personal-trainer', 'PeakForm Fitness', ['fitness', 'personal-training', 'outdoor']),
  makeProvider('other', 2, 'pt-maths-tutor', 'BrightPath Tutoring', ['tutoring', 'remote', 'maths']),
  makeProvider('other', 3, 'pt-photographer-comm', 'Studio North Creative', ['photography', 'creative', 'commercial']),
  makeProvider('other', 4, 'pt-pet-sitter', 'Happy Tails Care', ['pets', 'pet-sitting', 'insured']),
]

function makePackages(serviceId, providerSlug, isLegal, isEvents, index) {
  const basePrice = 650 + (index % 5) * 220
  const premiumPrice = 1450 + (index % 6) * 350
  const packageIndex = index % 3

  if (packageIndex === 0) {
    // Single package (flat price)
    return [{
      id: `seed-pkg-${serviceId}-single`,
      service_id: serviceId,
      name: 'Standard',
      description: 'Our most popular offering, suitable for most clients.',
      price: basePrice,
      discount_type: index % 5 === 0 ? 'percent' : 'none',
      discount_amount: index % 5 === 0 ? 10 : null,
      offerings: ['Full service as described', 'Materials included', 'Post-service follow-up'],
      requirements: 'Please confirm your address and preferred date at least 3 days ahead.',
      requirement_file_slots: [],
      delivery_time: isLegal ? '5 business days' : isEvents ? 'Same day' : '1–2 days',
      is_default: true,
      display_order: 0,
    }]
  } else {
    // Three-tier: Basic / Standard / Premium
    return [
      {
        id: `seed-pkg-${serviceId}-basic`,
        service_id: serviceId,
        name: 'Basic',
        description: 'Entry-level package covering the essentials.',
        price: Math.round(basePrice * 0.7),
        discount_type: 'none',
        discount_amount: null,
        offerings: ['Core service', 'Standard materials'],
        requirements: 'Client provides access to the premises.',
        requirement_file_slots: [],
        delivery_time: isLegal ? '7 business days' : '2–3 days',
        is_default: false,
        display_order: 0,
      },
      {
        id: `seed-pkg-${serviceId}-standard`,
        service_id: serviceId,
        name: 'Standard',
        description: 'The most popular choice for most clients.',
        price: basePrice,
        discount_type: index % 5 === 0 ? 'percent' : 'none',
        discount_amount: index % 5 === 0 ? 10 : null,
        offerings: ['Full service', 'Premium materials', 'Same-week scheduling'],
        requirements: 'Please confirm scope before booking.',
        requirement_file_slots: isLegal
          ? [{ name: 'ID document' }, { name: 'Signed mandate form' }]
          : [],
        delivery_time: isLegal ? '5 business days' : '1–2 days',
        is_default: true,
        display_order: 1,
      },
      {
        id: `seed-pkg-${serviceId}-premium`,
        service_id: serviceId,
        name: 'Premium',
        description: 'Maximum scope, priority scheduling, and richer deliverables.',
        price: premiumPrice,
        discount_type: 'none',
        discount_amount: null,
        offerings: ['Extended service hours', 'All materials included', 'Priority scheduling', 'Dedicated account manager'],
        requirements: 'Site visit or consultation required before booking.',
        requirement_file_slots: isEvents
          ? [{ name: 'Venue floor plan' }, { name: 'Guest list' }]
          : isLegal
            ? [{ name: 'ID document' }, { name: 'Supporting documentation' }]
            : [],
        delivery_time: isLegal ? '3 business days' : 'Next day',
        is_default: false,
        display_order: 2,
      },
    ]
  }
}

async function upsert(table, rows, options = {}) {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows, options)
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function main() {
  await upsert('provider_categories', categories, { onConflict: 'id' })
  await upsert('provider_types', types.map((type) => ({ ...type, is_seed: true })), { onConflict: 'id' })

  const tagNames = [...new Set(providers.flatMap((p) => p.tags))]
  const tags = tagNames.map((name) => ({ id: `seed-tag-${slugify(name)}`, name, is_seed: true }))
  await upsert('tags', tags, { onConflict: 'id' })

  await upsert('providers', providers.map((p) => {
    const row = { ...p }
    delete row.tags
    return row
  }), { onConflict: 'id' })

  await supabase.from('provider_tags').delete().in('provider_id', providers.map((p) => p.id))
  const providerTags = providers.flatMap((p) =>
    p.tags.map((tag) => ({ provider_id: p.id, tag_id: `seed-tag-${slugify(tag)}` })),
  )
  await upsert('provider_tags', providerTags)

  // Services — now with article_json, article_text, service_type, is_published
  const services = providers.flatMap((p, index) => {
    const isLegal = p.tags.includes('legal')
    const isEvents = p.tags.includes('events')
    const serviceType = isEvents ? 'time_based' : 'fixed_deliverable'

    return [
      {
        id: `seed-service-${p.slug}-standard`,
        provider_id: p.id,
        title: isLegal ? 'Initial consultation' : isEvents ? 'Planning session' : 'Standard service package',
        description: `A practical starter service from ${p.business_name}.`,
        price: 650 + (index % 5) * 220,
        discount_type: index % 5 === 0 ? 'percent' : 'none',
        discount_amount: index % 5 === 0 ? 10 : null,
        image: p.gallery[0],
        article_json: makeArticleJson(
          isLegal ? 'Initial consultation' : isEvents ? 'Planning session' : 'Standard service package',
          `A practical starter service from ${p.business_name}. We bring professional expertise to every engagement.`,
          p.business_name,
        ),
        article_text: `A practical starter service from ${p.business_name}. We bring professional expertise to every engagement.`,
        service_type: serviceType,
        is_published: true,
        is_seed: true,
      },
      {
        id: `seed-service-${p.slug}-premium`,
        provider_id: p.id,
        title: 'Premium package',
        description: `Expanded support with more scope, priority scheduling, and richer deliverables.`,
        price: 1450 + (index % 6) * 350,
        discount_type: 'none',
        discount_amount: null,
        image: p.gallery[1],
        article_json: makeArticleJson(
          'Premium package',
          `Our premium offering from ${p.business_name} delivers maximum scope, priority scheduling, and richer deliverables for clients who want the best.`,
          p.business_name,
        ),
        article_text: `Our premium offering from ${p.business_name} delivers maximum scope, priority scheduling, and richer deliverables for clients who want the best.`,
        service_type: serviceType,
        is_published: true,
        is_seed: true,
      },
    ]
  })
  await upsert('services', services, { onConflict: 'id' })

  // Packages — every seeded service gets at least one package with a default flagged
  const allPackages = providers.flatMap((p, index) => {
    const isLegal = p.tags.includes('legal')
    const isEvents = p.tags.includes('events')
    return [
      ...makePackages(`seed-service-${p.slug}-standard`, p.slug, isLegal, isEvents, index),
      ...makePackages(`seed-service-${p.slug}-premium`, p.slug, isLegal, isEvents, index + 1),
    ]
  })
  await upsert('service_packages', allPackages, { onConflict: 'id' })

  // Customers
  const customers = providers.flatMap((p, index) => [1, 2].map((n) => ({
    id: `seed-customer-${p.slug}-${n}`,
    email: `seed-${p.slug}-${n}@example.com`,
    name: ['Amina Jacobs', 'Thabo Mokoena', 'Sarah Naidoo', 'Lerato Dlamini'][(index + n) % 4],
    phone: `+2700000${String(index).padStart(2, '0')}${n}`,
  })))
  await upsert('customers', customers, { onConflict: 'id' })

  // Bookings — reference default package
  const bookings = providers.flatMap((p, index) => [1, 2].map((n) => {
    const serviceId = `seed-service-${p.slug}-${n === 1 ? 'standard' : 'premium'}`
    // Find the default package for this service
    const pkgIndex = index % 3
    const defaultPkgId = pkgIndex === 0
      ? `seed-pkg-${serviceId}-single`
      : `seed-pkg-${serviceId}-standard`
    return {
      id: `seed-booking-${p.slug}-${n}`,
      provider_id: p.id,
      customer_id: `seed-customer-${p.slug}-${n}`,
      service_id: serviceId,
      status: 'completed',
      payment_status: 'captured',
      final_price: n === 1 ? 850 + (index % 5) * 180 : 1600 + (index % 5) * 280,
      commission_amount: 80,
      provider_payout_amount: n === 1 ? 770 : 1520,
      _default_pkg_id: defaultPkgId,
    }
  }))

  await upsert('bookings', bookings.map(({ _default_pkg_id, ...b }) => b), { onConflict: 'id' })

  // Reviews — package-tagged for display context
  const reviews = bookings.map((booking, index) => {
    const packageTiers = ['basic', 'standard', 'premium']
    const serviceId = booking.service_id
    const pkgIndex = index % 3
    // Pick a package that exists for this service
    const packageSuffix = pkgIndex === 0 ? 'single' : packageTiers[pkgIndex % 3]
    const packageId = `seed-pkg-${serviceId}-${packageSuffix}`
    return {
      id: `seed-review-${booking.id}`,
      booking_id: booking.id,
      service_id: serviceId,
      package_id: booking._default_pkg_id,
      provider_id: booking.provider_id,
      customer_id: booking.customer_id,
      rating: 4 + (index % 2),
      comment: index % 2
        ? 'Professional, clear communication, and the service matched what was described in the article.'
        : 'Great experience. The package breakdown helped us choose the right tier with confidence.',
      is_seed: true,
    }
  })
  await upsert('reviews', reviews, { onConflict: 'id' })

  // Content posts
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

  // Seed one message thread per booking so Messages section has data
  const threads = bookings.map((booking) => ({
    id: `seed-thread-${booking.id}`,
    provider_id: booking.provider_id,
    customer_id: booking.customer_id,
    service_id: booking.service_id,
    booking_id: booking.id,
  }))
  await upsert('message_threads', threads, { onConflict: 'id' })

  const messages = threads.flatMap((thread, index) => [
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

  // service_sale_prices — one row per booking so price-change band checks have
  // real sale history to verify against. Covers all 5 price-change bands:
  //   Band 1 (≤5%):      booking price used directly
  //   Band 2 (5–9.5%):   second booking uses +7% over first
  //   Band 3 (9.5–25%):  third booking (first of the second batch) at +15%
  //   Band 4 (25–50%):   +35% variant
  //   Band 5 (≥50%):     +60% variant — triggers held-price state on edit
  //
  // The sale_price here is the price_paid recorded on the booking.
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
    `Seeded ${providers.length} providers, ${services.length} services, ` +
    `${allPackages.length} packages, ${reviews.length} reviews, ` +
    `${threads.length} message threads, ${posts.length} posts, ` +
    `and ${salePriceRows.length} sale price history rows (all 5 price-change bands).`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
