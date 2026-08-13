import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { tiptapToHtml } from '@/lib/tiptap-to-html'
import { Avatar } from '@/components/ui/Avatar'
import { StarRating } from '@/components/ui/StarRating'
import { PackageSelector } from '@/components/PackageSelector'
import { JsonLd } from '@/components/seo/JsonLd'
import type { DiscountType, ServiceType } from '@/lib/db'
import { breadcrumbJsonLd, canonicalAlternates, serviceJsonLd } from '@/lib/seo'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: service, error } = await supabase
    .from('services')
    .select(`
      title, description, image,
      service_packages:service_packages!service_packages_service_id_fkey(price, discount_type, discount_amount),
      provider:providers!services_provider_id_fkey!inner(business_name, location_city, is_published)
    `)
    .eq('id', id)
    .eq('is_published', true)
    .eq('provider.is_published', true)
    .maybeSingle()
  if (error) {
    console.error('Service metadata query failed:', error.message)
    return {}
  }
  if (!service) return {}

  const provider = Array.isArray(service.provider) ? service.provider[0] : service.provider
  if (!provider?.is_published) return {}

  const packages = (service.service_packages ?? []) as {
    price: number; discount_type: DiscountType; discount_amount: number | null
  }[]
  const lowestPrice = packages.length
    ? Math.min(...packages.map((p) => effectivePrice(Number(p.price), p.discount_type, p.discount_amount)))
    : null

  const title = `${service.title} by ${provider.business_name}`
  const city = provider.location_city ? ` in ${provider.location_city}` : ''
  const priceText = lowestPrice !== null ? ` from R${lowestPrice.toFixed(0)}` : ''
  const description = `Book ${service.title} from ${provider.business_name}${city}. Compare packages${priceText}, reviews, and provider details on ServicePros.`

  return {
    title,
    description,
    alternates: canonicalAlternates(`/services/${id}`),
    openGraph: {
      title,
      description,
      images: service.image ? [service.image] : undefined,
    },
  }
}

function effectivePrice(price: number, type: DiscountType, amount: number | null): number {
  if (type === 'none' || amount === null) return price
  if (type === 'amount') return Math.max(0, price - amount)
  return price * (1 - amount / 100)
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: service, error: serviceError }, { data: { user } }] = await Promise.all([
    supabase
      .from('services')
      .select(`
        id, title, description, image, article_json, service_type, is_published,
        provider:providers!services_provider_id_fkey!inner(
          id, business_name, slug, profile_image, bio,
          location_city, location_state,
          is_published,
          provider_types:provider_types!providers_provider_type_id_fkey!inner(
            name, slug,
            provider_categories:provider_categories!provider_types_category_id_fkey(name, slug)
          ),
          provider_tags:provider_tags!provider_tags_provider_id_fkey(
            tag:tags!provider_tags_tag_id_fkey(name)
          ),
          reviews:reviews!reviews_provider_id_fkey(rating)
        ),
        service_packages:service_packages!service_packages_service_id_fkey(
          id, name, description, price, discount_type, discount_amount,
          offerings, requirements, requirement_file_slots, delivery_time,
          is_default, display_order
        ),
        reviews:reviews!reviews_service_id_fkey(
          id, rating, comment, created_at,
          customer:customers(name),
          package:service_packages!reviews_package_id_fkey(name)
        )
      `)
      .eq('id', id)
      .eq('is_published', true)
      .eq('provider.is_published', true)
      .maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (serviceError) {
    console.error('Service detail query failed:', serviceError.message)
    notFound()
  }
  if (!service) notFound()

  function first<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null
    return Array.isArray(v) ? v[0] ?? null : v
  }

  const provider = first(service.provider) as {
    id: string; business_name: string; slug: string | null; profile_image: string | null
    bio: string | null; location_city: string | null; location_state: string | null
    is_published: boolean
    provider_types: { name: string; slug: string; provider_categories: { name: string; slug: string } | { name: string; slug: string }[] | null } | { name: string; slug: string; provider_categories: { name: string; slug: string } | { name: string; slug: string }[] | null }[] | null
    provider_tags: { tag: { name: string } | { name: string }[] | null }[] | null
    reviews: { rating: number }[] | null
  } | null

  if (!provider?.is_published) notFound()

  const providerType = first(provider.provider_types)
  const category = first(providerType?.provider_categories)
  const tags = (provider.provider_tags ?? [])
    .map((pt) => first(pt.tag)?.name)
    .filter((n): n is string => Boolean(n))
  const providerReviews = provider.reviews ?? []
  const providerAvgRating = providerReviews.length
    ? providerReviews.reduce((s, r) => s + r.rating, 0) / providerReviews.length
    : null
  const providerSlug = provider.slug ?? provider.id
  const location = [provider.location_city, provider.location_state].filter(Boolean).join(', ')

  const packages = ((service.service_packages ?? []) as {
    id: string; name: string; description: string; price: number
    discount_type: DiscountType; discount_amount: number | null
    offerings: unknown; requirements: string; requirement_file_slots: unknown
    delivery_time: string
    is_default: boolean; display_order: number
  }[]).sort((a, b) => a.display_order - b.display_order)

  const reviews = ((service.reviews ?? []) as {
    id: string; rating: number; comment: string; created_at: string
    customer: { name: string }[] | { name: string } | null
    package: { name: string }[] | { name: string } | null
  }[])

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const articleHtml = service.article_json ? tiptapToHtml(service.article_json) : null
  const serviceType = service.service_type as ServiceType
  const ctaVerb = serviceType === 'time_based' ? 'Book' : 'Order'
  const signInUrl = `/sign-in?next=/services/${id}`

  const lowestPrice = packages.length
    ? Math.min(...packages.map((p) => effectivePrice(Number(p.price), p.discount_type, p.discount_amount)))
    : null
  const servicePath = `/services/${id}`

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
            { name: provider.business_name, path: `/providers/${providerSlug}` },
            { name: service.title, path: servicePath },
          ]),
          serviceJsonLd({
            title: service.title,
            description: service.description,
            path: servicePath,
            image: service.image,
            category: category?.name ?? providerType?.name ?? null,
            provider: {
              name: provider.business_name,
              path: `/providers/${providerSlug}`,
              city: provider.location_city,
              region: provider.location_state,
              country: 'ZA',
            },
            packages: packages.map((pkg) => ({
              name: pkg.name,
              description: pkg.description,
              price: effectivePrice(Number(pkg.price), pkg.discount_type, pkg.discount_amount),
            })),
            rating: avgRating !== null ? { value: avgRating, count: reviews.length } : null,
          }),
        ]}
      />

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link href="/" className="hover:underline hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link href="/services" className="hover:underline hover:text-foreground transition-colors">Services</Link>
        <span>/</span>
        <Link href={`/providers/${providerSlug}`} className="hover:underline hover:text-foreground transition-colors">
          {provider.business_name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{service.title}</span>
      </nav>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start">

        {/* ── LEFT: Service content ─────────────────────────────────── */}
        <div className="min-w-0">

          {/* Cover image */}
          {service.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.image}
              alt={`${service.title} from ${provider.business_name}${location ? ` in ${location}` : ''}`}
              className="w-full rounded-2xl object-cover max-h-80 mb-8"
            />
          )}

          {/* Title block */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              {category && (
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-accent mb-1">
                  {category.name}
                </p>
              )}
              <h1 className="text-3xl font-bold tracking-tight leading-tight">{service.title}</h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">{service.description}</p>
            </div>
            {lowestPrice !== null && (
              <div className="flex-shrink-0 rounded-2xl border border-border bg-muted/40 px-5 py-3 text-right">
                <p className="text-xs text-muted-foreground mb-0.5">From</p>
                <p className="text-2xl font-bold tabular-nums">R&nbsp;{lowestPrice.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Rating summary */}
          {(avgRating !== null || reviews.length > 0) && (
            <div className="mb-8 flex items-center gap-3">
              <StarRating rating={avgRating ?? 0} reviewCount={reviews.length} />
              {reviews.length > 0 && (
                <a href="#reviews" className="text-sm text-primary hover:underline">
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </a>
              )}
            </div>
          )}

          {/* Article */}
          {articleHtml && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4">About this service</h2>
              <div
                className="prose prose-neutral dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />
            </section>
          )}

          {/* Provider card */}
          <section className="mb-12 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-5">About the provider</h2>
            <div className="flex gap-4 items-start">
              <Avatar
                src={provider.profile_image}
                alt={`${provider.business_name}${location ? `, ${location}` : ''}`}
                size="lg"
                shape="rounded"
                className="flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Link
                    href={`/providers/${providerSlug}`}
                    className="font-semibold text-foreground hover:text-primary-accent hover:underline transition-colors"
                  >
                    {provider.business_name}
                  </Link>
                  {providerType && (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {providerType.name}
                    </span>
                  )}
                </div>
                {location && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location}
                  </p>
                )}
                {providerAvgRating !== null && (
                  <StarRating rating={providerAvgRating} reviewCount={providerReviews.length} size="sm" />
                )}
                {provider.bio && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {provider.bio}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/providers/${providerSlug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-accent hover:underline"
                >
                  View full profile
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>

          {/* Reviews */}
          {reviews.length > 0 && (
            <section id="reviews" className="mb-12">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="text-xl font-semibold">Reviews</h2>
                {avgRating !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold tabular-nums">{avgRating.toFixed(1)}</span>
                    <div>
                      <StarRating rating={avgRating} size="sm" />
                      <p className="text-xs text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {reviews.map((review) => {
                  const customer = first(review.customer)
                  const pkg = first(review.package)
                  const initials = customer?.name
                    ? customer.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?'
                  return (
                    <article key={review.id} className="rounded-2xl border border-border p-5">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <svg key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted-foreground/20 text-muted-foreground/30'}`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">{review.comment}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {initials}
                          </span>
                          {customer?.name && <span className="text-sm font-medium">{customer.name}</span>}
                        </div>
                        {pkg?.name && (
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                            {pkg.name} package
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT: Package selector (sticky) ─────────────────────── */}
        <aside className="xl:sticky xl:top-6">
          <PackageSelector
            packages={packages.map((pkg) => ({
              id: pkg.id,
              name: pkg.name,
              description: pkg.description,
              price: Number(pkg.price),
              discount_type: pkg.discount_type,
              discount_amount: pkg.discount_amount !== null ? Number(pkg.discount_amount) : null,
              offerings: Array.isArray(pkg.offerings) ? (pkg.offerings as string[]) : [],
              delivery_time: pkg.delivery_time,
              is_default: pkg.is_default,
            }))}
            serviceId={service.id}
            serviceName={service.title}
            ctaVerb={ctaVerb}
            isSignedIn={!!user}
            signInUrl={signInUrl}
            providerSlug={providerSlug}
          />
        </aside>
      </div>
    </main>
  )
}
