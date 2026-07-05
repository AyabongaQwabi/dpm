import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  Globe,
  Languages,
  Star,
  Briefcase,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeList } from '@/components/ui/badge'
import { StarRating } from '@/components/ui/StarRating'
import { RecommendedServices } from '@/components/home/RecommendedServices'
import type { DiscountType } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { getRecommendedServices } from '@/lib/recommended-services'
import { InMemoryConfigStore } from '@/lib/domain/config'
import { formatCredits } from '@/lib/format-credits'
import {
  canonicalAlternates,
  localBusinessJsonLd,
} from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { UnclaimedProfileBanner } from '@/components/providers/UnclaimedProfileBanner'

const RECOMMENDATION_DEFAULTS: Record<string, number> = {
  min_reviews_for_recommendation: 5,
  recommendation_weight_recency_rating: 0.35,
  recommendation_weight_booking_volume: 0.25,
  recommendation_weight_reliability: 0.25,
  recommendation_weight_review_ratio: 0.15,
  recommendation_recency_half_life_days: 180,
}

interface ProfilePageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 1800

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function getProvider(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select(`
      id,
      slug,
      business_name,
      bio,
      profile_image,
      gallery,
      faqs,
      links,
      social_links,
      languages,
      portfolio,
      location_city,
      location_state,
      location_country,
      phone,
      website,
      address,
      claim_status,
      is_scraped,
      provider_types!inner(name, slug, provider_categories(name, slug)),
      provider_tags(tag:tags(name)),
      services(id, title, description, image, is_published, service_type,
        service_packages(id, name, price, discount_type, discount_amount, is_default, delivery_time, display_order)),
      reviews(id, rating, comment, created_at, package_id,
        customer:customers(name),
        package:service_packages(name)),
      content_posts(id, image_url, body, post_type, created_at),
      field_values:provider_field_values(field_id, value, field:fields(key))
    `)
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .eq('is_published', true)
    .order('created_at', { referencedTable: 'services', ascending: true })
    .order('created_at', { referencedTable: 'reviews', ascending: false })
    .order('created_at', { referencedTable: 'content_posts', ascending: false })
    .single()

  return data
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const provider = await getProvider(slug)

  if (!provider) return {}

  const title = `${provider.business_name}${provider.location_city ? ` in ${provider.location_city}` : ''}`
  const profilePath = provider.slug ?? provider.id
  return {
    title,
    description: provider.bio?.slice(0, 160) ?? `View services, reviews, posts, and contact details for ${provider.business_name}.`,
    alternates: canonicalAlternates(`/providers/${profilePath}`),
    openGraph: provider.profile_image ? { images: [provider.profile_image] } : undefined,
  }
}

const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  instagram: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z',
  twitter: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.7 5.4 4.3 9 4-.9-4.2 4-6.5 6.6-3.5 1.3 0 2.8-.7 4.4-1.5z',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z',
  tiktok: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5',
  whatsapp: 'M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
}

export default async function ProviderProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const provider = await getProvider(slug)

  if (!provider) notFound()

  const { data: configRows } = await supabase.from('platform_config').select('key, value')
  const config = new InMemoryConfigStore({
    ...RECOMMENDATION_DEFAULTS,
    ...Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value])),
  })
  const recommendedServices = await getRecommendedServices({ config, providerId: provider.id, limit: 6 })

  const profilePath = provider.slug ?? provider.id
  const claimStatus = (provider.claim_status as string | undefined) ?? 'claimed'
  const isClaimable = claimStatus !== 'claimed'
  const providerType = first(provider.provider_types)
  const category = first(providerType?.provider_categories)
  const tags = (provider.provider_tags ?? [])
    .map((pt: { tag: { name: string }[] | { name: string } | null }) => first(pt.tag)?.name)
    .filter((name): name is string => Boolean(name))
  const fieldValues = (provider.field_values ?? []) as {
    field_id: string
    value: unknown
    field: { key: string }[] | { key: string } | null
  }[]
  const galleryFieldValue = fieldValues.find((fv) => {
    const f = first(fv.field)
    return f?.key === 'gallery'
  })
  const galleryFromField: string[] = (() => {
    const raw = galleryFieldValue?.value
    if (Array.isArray(raw)) return raw as string[]
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
    }
    return []
  })()
  const galleryFromColumn = Array.isArray(provider.gallery) ? (provider.gallery as string[]) : []
  const gallery = galleryFromField.length > 0 ? galleryFromField : galleryFromColumn
  const faqs = Array.isArray(provider.faqs)
    ? (provider.faqs as { question: string; answer: string }[])
    : []
  const links = Array.isArray(provider.links)
    ? (provider.links as { label: string; url: string }[])
    : []
  const socialLinks = Array.isArray(provider.social_links)
    ? (provider.social_links as { platform: string; url: string }[])
    : []
  const languages = Array.isArray(provider.languages)
    ? (provider.languages as string[])
    : []
  const portfolio = Array.isArray(provider.portfolio)
    ? (provider.portfolio as { title: string; description: string; image_url: string; file_url?: string; link?: string }[])
    : []
  const reviews = (provider.reviews ?? []) as unknown as {
    id: string
    rating: number
    comment: string
    created_at: string
    package_id: string | null
    customer: { name: string }[] | { name: string } | null
    package: { name: string }[] | { name: string } | null
  }[]
  const services = (provider.services ?? []) as {
    id: string
    title: string
    description: string
    image: string | null
    is_published: boolean
    service_type: string
    service_packages: {
      id: string
      name: string
      price: number
      discount_type: DiscountType
      discount_amount: number | null
      is_default: boolean
      delivery_time: string
      display_order: number
    }[]
  }[]
  const publishedServices = services.filter((s) => s.is_published)
  const contentPosts = (provider.content_posts ?? []) as {
    id: string
    image_url: string | null
    body: string | null
    post_type: string
    created_at: string
  }[]

  const fieldPhone = fieldValues.find((fv) => first(fv.field)?.key === 'phone')?.value
  const fieldWebsite = fieldValues.find((fv) => first(fv.field)?.key === 'website')?.value
  const contactPhone = (provider.phone as string | null) ?? (typeof fieldPhone === 'string' ? fieldPhone : null)
  const contactWebsite = (provider.website as string | null) ?? (typeof fieldWebsite === 'string' ? fieldWebsite : null)
  const contactAddress = provider.address as string | null

  const avgRating = reviews.length && !isClaimable
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null
  const location = [provider.location_city, provider.location_state].filter(Boolean).join(', ')

  const tabs = [
    ['overview', 'Overview'],
    publishedServices.length ? ['services', 'Services'] : null,
    portfolio.length ? ['portfolio', 'Portfolio'] : null,
    recommendedServices.length ? ['recommended', 'Top Services'] : null,
    gallery.length ? ['gallery', 'Gallery'] : null,
    reviews.length ? ['reviews', 'Reviews'] : null,
    contentPosts.length ? ['posts', 'Posts'] : null,
    !isClaimable ? ['contact', 'Request'] : null,
  ].filter(Boolean) as string[][]

  const ratingDistribution = reviews.length
    ? [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
        pct: Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100),
      }))
    : []

  return (
    <main>
      <JsonLd
        data={localBusinessJsonLd({
          business_name: provider.business_name,
          bio: provider.bio,
          profile_image: provider.profile_image,
          slug: provider.slug,
          id: provider.id,
          location_city: provider.location_city,
          location_state: provider.location_state,
          location_country: provider.location_country,
          avgRating,
          reviewCount: reviews.length,
          categoryName: category?.name ?? null,
        })}
      />
      {/* ── Hero / Header ──────────────────────────────────────────────── */}
      <section className="relative border-b bg-muted/30 overflow-hidden">
        {/* Craft pattern accent bar */}
        <div className="craft-rule w-full" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4 py-10">
          {isClaimable && (
            <div className="mb-6">
              <UnclaimedProfileBanner
                slug={profilePath}
                status={claimStatus === 'claim_pending' ? 'claim_pending' : 'unclaimed'}
              />
            </div>
          )}
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* Left: Identity */}
            <div className="flex flex-col gap-6 sm:flex-row reveal">
              <div className="relative flex-shrink-0">
                <Avatar
                  src={provider.profile_image}
                  alt={provider.business_name}
                  size="xl"
                  shape="rounded"
                  className="h-28 w-28 ring-4 ring-background shadow-lg"
                />
                {provider.profile_image && (
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-background" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-accent mb-1">
                  {category?.name ?? providerType?.name}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {provider.business_name}
                </h1>
                {isClaimable && (
                  <span className="mt-2 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    Unverified listing
                  </span>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {providerType?.name && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary-accent" />
                      {providerType.name}
                    </span>
                  )}
                  {location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary-accent" />
                      {location}
                    </span>
                  )}
                  {languages.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 text-primary-accent" />
                      {languages.slice(0, 2).join(', ')}
                      {languages.length > 2 && ` +${languages.length - 2}`}
                    </span>
                  )}
                  {avgRating !== null && <StarRating rating={avgRating} reviewCount={reviews.length} />}
                </div>
                {tags.length > 0 && (
                  <div className="mt-4">
                    <BadgeList tags={tags} max={tags.length} />
                  </div>
                )}
                {socialLinks.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {socialLinks.map((link, i) => {
                      const platform = link.platform.toLowerCase()
                      const iconPath = SOCIAL_ICONS[platform]
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={link.platform}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-card text-muted-foreground hover:border-primary-accent hover:text-primary-accent hover:bg-primary-accent/5 transition-colors duration-200 cursor-pointer"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            {iconPath ? (
                              <path d={iconPath} />
                            ) : (
                              <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>
                            )}
                          </svg>
                        </a>
                      )
                    })}
                    {links.map((link, i) => (
                      <a
                        key={`ext-${i}`}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:border-primary-accent hover:text-primary-accent hover:bg-primary-accent/5 transition-colors duration-200 cursor-pointer"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: How it works card */}
            <aside className="rounded-2xl border border-border bg-card shadow-sm p-5 reveal reveal-delay-1">
              <h2 className="font-display font-semibold text-base text-foreground">How it works</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Browse the services below and request the one you need. Direct messaging isn&apos;t
                available up front &mdash; chat unlocks in your dashboard once you&apos;ve requested a
                service from this provider.
              </p>
              <ol className="mt-4 space-y-2.5">
                {[
                  'Pick a service that fits',
                  'Send a service request',
                  'Chat opens in your dashboard',
                ].map((step, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-accent/15 border border-primary-accent/30 flex items-center justify-center text-xs font-bold text-primary-accent">{i + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
              {!isClaimable ? (
                <Link
                  href={services.length ? '#services' : `/sign-in?next=/providers/${profilePath}`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary-accent px-4 py-3 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  Request a service
                </Link>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  Bookings are unavailable until the business owner claims this profile.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* ── Sticky tab nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-16 z-30 border-b bg-background/90 backdrop-blur" aria-label="Profile sections">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2.5">
          {tabs.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex-shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary-accent/50 hover:text-foreground hover:bg-primary-accent/5 transition-colors duration-200 cursor-pointer"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Page body ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 space-y-16">

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <section id="overview" className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Overview</h2>
            {provider.bio && (
              <p className="mt-4 max-w-3xl whitespace-pre-line leading-8 text-muted-foreground">
                {provider.bio}
              </p>
            )}

            {faqs.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display font-semibold text-lg text-foreground mb-4">
                  Frequently asked questions
                </h3>
                <div className="grid gap-3">
                  {faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-[var(--radius)] border border-border bg-card overflow-hidden"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors list-none">
                        {faq.question}
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
                      </summary>
                      <div className="border-t border-border px-5 py-4">
                        <p className="text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile details sidebar */}
          <div className="space-y-4">
            <div className="rounded-[var(--radius)] border border-border bg-card p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Profile details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 items-start">
                  <dt className="text-muted-foreground flex-shrink-0">Category</dt>
                  <dd className="font-medium text-right">{category?.name ?? 'General'}</dd>
                </div>
                <div className="flex justify-between gap-4 items-start">
                  <dt className="text-muted-foreground flex-shrink-0">Type</dt>
                  <dd className="font-medium text-right">{providerType?.name ?? 'Provider'}</dd>
                </div>
                {location && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Location</dt>
                    <dd className="font-medium text-right">{location}</dd>
                  </div>
                )}
                {contactAddress && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Address</dt>
                    <dd className="font-medium text-right">{contactAddress}</dd>
                  </div>
                )}
                {contactPhone && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Phone</dt>
                    <dd className="font-medium text-right">{contactPhone}</dd>
                  </div>
                )}
                {contactWebsite && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Website</dt>
                    <dd className="font-medium text-right">
                      <a href={contactWebsite} target="_blank" rel="noreferrer noopener" className="text-primary-accent hover:underline">
                        {contactWebsite.replace(/^https?:\/\//, '')}
                      </a>
                    </dd>
                  </div>
                )}
                {provider.location_country && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Country</dt>
                    <dd className="font-medium text-right">{provider.location_country}</dd>
                  </div>
                )}
                {avgRating !== null && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Rating</dt>
                    <dd className="font-semibold text-right">
                      <span className="text-accent">★</span> {avgRating.toFixed(1)} ({reviews.length})
                    </dd>
                  </div>
                )}
                {publishedServices.length > 0 && (
                  <div className="flex justify-between gap-4 items-start">
                    <dt className="text-muted-foreground flex-shrink-0">Services</dt>
                    <dd className="font-medium text-right">{publishedServices.length}</dd>
                  </div>
                )}
              </dl>
            </div>

            {languages.length > 0 && (
              <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                <h3 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-primary-accent" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────────────────── */}
        {publishedServices.length > 0 && (
          <section id="services">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Services</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {publishedServices.length} service{publishedServices.length !== 1 ? 's' : ''} offered by {provider.business_name}
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {publishedServices.map((service) => {
                const packages = Array.isArray(service.service_packages) ? service.service_packages : []
                const defaultPkg = packages.find((p) => p.is_default) ?? packages[0]
                const ctaLabel = service.service_type === 'time_based' ? 'Book' : 'Order'
                return (
                  <div key={service.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-md hover:border-primary-accent/30 transition-all duration-200 cursor-pointer">
                    {service.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={service.image} alt={service.title} className="h-44 w-full object-cover" />
                    ) : (
                      <div className="h-32 w-full bg-muted/50 craft-pattern flex items-center justify-center">
                        <Briefcase className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="font-display font-semibold text-base text-foreground">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex-1 leading-relaxed">{service.description}</p>
                      {packages.length > 0 && (
                        <div className="mt-3 space-y-1.5 rounded-[var(--radius)] bg-muted/40 p-3">
                          {packages.sort((a, b) => a.display_order - b.display_order).map((pkg) => (
                            <div key={pkg.id} className="flex items-center justify-between text-sm gap-2">
                              <span className={`truncate ${pkg.is_default ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                {pkg.name}
                                {pkg.is_default && (
                                  <span className="ml-1.5 text-xs rounded-full bg-primary-accent/15 text-primary-accent px-1.5 py-0.5 font-medium">default</span>
                                )}
                              </span>
                              <span className={`flex-shrink-0 tabular-nums ${pkg.is_default ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                R {Number(pkg.price).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
                        {defaultPkg && (
                          <div>
                            <span className="font-bold text-foreground">from {formatCredits(Number(defaultPkg.price))}</span>
                            {defaultPkg.delivery_time && (
                              <p className="text-xs text-muted-foreground mt-0.5">{defaultPkg.delivery_time}</p>
                            )}
                          </div>
                        )}
                        {!isClaimable && (
                          <Link
                            href={`/sign-in?next=/providers/${profilePath}`}
                            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-primary-accent px-4 py-2 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0"
                          >
                            {ctaLabel}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Portfolio ─────────────────────────────────────────────────── */}
        {portfolio.length > 0 && (
          <section id="portfolio">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Portfolio</h2>
              <p className="mt-1 text-sm text-muted-foreground">Past work and projects by {provider.business_name}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((item, index) => (
                <div key={index} className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary-accent/30 transition-all duration-200">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.title} className="h-48 w-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                  ) : (
                    <div className="h-40 w-full bg-muted/50 craft-pattern flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-sm text-foreground">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">{item.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-accent hover:underline cursor-pointer"
                        >
                          <Globe className="h-3 w-3" />
                          View project
                        </a>
                      )}
                      {item.file_url && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-accent hover:underline cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recommended ─────────────────────────────────────────────── */}
        {recommendedServices.length > 0 && (
          <section id="recommended">
            <h2 className="font-display text-2xl font-bold text-foreground">Top services</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ranked by verified reviews and booking volume.</p>
            <div className="mt-6">
              <RecommendedServices services={recommendedServices} />
            </div>
          </section>
        )}

        {/* ── Gallery ──────────────────────────────────────────────────── */}
        {gallery.length > 0 && (
          <section id="gallery">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Gallery</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt={`${provider.business_name} gallery ${index + 1}`}
                  className="aspect-[4/3] w-full rounded-[var(--radius)] object-cover hover:opacity-95 transition-opacity cursor-pointer"
                  loading="lazy"
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <section id="reviews">
            <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
              {/* Rating summary */}
              <div className="rounded-2xl border border-border bg-card p-6 self-start">
                <h2 className="font-display text-2xl font-bold text-foreground">Reviews</h2>
                {avgRating !== null && (
                  <div className="mt-4">
                    <div className="flex items-end gap-3">
                      <span className="font-display text-5xl font-bold text-foreground tabular-nums">{avgRating.toFixed(1)}</span>
                      <div className="pb-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= Math.round(avgRating) ? 'fill-accent text-accent' : 'text-muted'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {ratingDistribution.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground tabular-nums">{star}</span>
                          <Star className="h-3 w-3 fill-accent text-accent flex-shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-4 text-right text-muted-foreground tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Review cards */}
              <div className="grid gap-4 md:grid-cols-2 content-start">
                {reviews.map((review) => {
                  const customer = first(review.customer)
                  const initials = customer?.name
                    ? customer.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?'
                  return (
                    <article key={review.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between gap-4">
                        <StarRating rating={review.rating} size="sm" />
                        <time className="text-xs text-muted-foreground" dateTime={review.created_at}>
                          {new Date(review.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground flex-1">{review.comment}</p>
                      <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-border">
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {initials}
                          </span>
                          {customer?.name && <p className="text-sm font-medium text-foreground">{customer.name}</p>}
                        </div>
                        {(() => {
                          const pkg = first(review.package)
                          return pkg?.name ? (
                            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted/50">
                              {pkg.name}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Posts ────────────────────────────────────────────────────── */}
        {contentPosts.length > 0 && (
          <section id="posts">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Latest posts</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {contentPosts.map((post) => (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary-accent/30 transition-all duration-200">
                  {post.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image_url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-accent">{post.post_type}</p>
                    {post.body && <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{post.body}</p>}
                    <time className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground" dateTime={post.created_at}>
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(post.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── Contact / CTA ────────────────────────────────────────────── */}
        {!isClaimable && (
        <section id="contact" className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="craft-pattern absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-accent mb-2">Ready to start?</p>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Request a service from {provider.business_name}
                </h2>
                <p className="mt-2 text-muted-foreground text-sm max-w-xl leading-relaxed">
                  To keep things safe, you can&apos;t message {provider.business_name} directly. Request a
                  service and a private chat will open in your dashboard so you can sort out the details there.
                </p>
                {(links.length > 0 || socialLinks.length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {links.map((link, index) => (
                      <a
                        key={`${link.url}-${index}`}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground hover:border-primary-accent/50 hover:text-foreground transition-colors cursor-pointer"
                      >
                        {link.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                    {socialLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground hover:border-primary-accent/50 hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {link.platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href={`/sign-in?next=/providers/${profilePath}`}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-primary-accent px-6 py-3.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap shadow-sm"
              >
                <CalendarDays className="h-4 w-4" />
                Request a service
              </Link>
            </div>
          </div>
        </section>
        )}

      </div>
    </main>
  )
}
