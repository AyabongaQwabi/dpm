import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { getServices, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import { normalizeServiceTypeSlug } from '@/lib/domain/service-title'
import { breadcrumbJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd, seoIndexPolicy, SEO_INDEX_THRESHOLDS } from '@/lib/seo'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getServicesForSlug(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  const allServices = await getServices(supabase, 500)
  return allServices.filter((service) => normalizeServiceTypeSlug(service.title) === slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = titleFromSlug(slug)
  const title = `${service} services in South Africa`
  const description = `Find providers offering ${service.toLowerCase()} services. Compare profiles, locations, and pricing on ServicePros.`
  const path = `/providers/service/${slug}`
  const supabase = await createClient()
  const services = await getServicesForSlug(supabase, slug)
  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
    robots: seoIndexPolicy(services.length, SEO_INDEX_THRESHOLDS.serviceTypeMinServices),
  }
}

export default async function ProvidersByServicePage({ params }: PageProps) {
  const { slug } = await params
  const serviceName = titleFromSlug(slug)
  const supabase = await createClient()
  const services = await getServicesForSlug(supabase, slug)
  const providersBySlug = new Map<string, { slug: string | null; id: string; business_name: string }>()
  for (const service of services) {
    const key = service.providerSlug ?? service.provider_id
    if (!providersBySlug.has(key)) {
      providersBySlug.set(key, {
        slug: service.providerSlug,
        id: service.provider_id,
        business_name: service.providerName,
      })
    }
  }

  const cities = [...new Set(services.map((s) => s.locationCity).filter((c): c is string => Boolean(c)))].slice(0, 6)

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
            { name: `${serviceName} services`, path: `/providers/service/${slug}` },
          ]),
          providerListJsonLd(`${serviceName} providers`, [...providersBySlug.values()]),
        ]}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Service</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{serviceName} providers</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Providers and service offers matching {serviceName.toLowerCase()}.
        </p>
      </section>
      <section className="mt-10 grid gap-4">
        {services.map((service) => (
          <Link key={service.id} href={`/providers/${service.providerSlug}`} className="rounded-lg border p-5 hover:bg-muted/50">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="font-semibold">{service.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                <p className="mt-3 text-sm">by {service.providerName}{service.locationCity ? ` in ${service.locationCity}` : ''}</p>
              </div>
              <p className="font-semibold">R {Number(service.price).toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </section>

      {(cities.length > 0) && (
        <section className="mt-12 border-t pt-8">
          <h2 className="text-lg font-semibold tracking-tight">Related searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link
                key={city}
                href={`/providers/in/${city.toLowerCase().replaceAll(' ', '-')}`}
                className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
              >
                Providers in {city}
              </Link>
            ))}
            <Link href="/services" className="rounded-full border px-4 py-2 text-sm hover:bg-muted">
              Browse all services
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
