import type { Metadata } from 'next'
import Link from 'next/link'
import { getServices, titleFromSlug } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = titleFromSlug(slug)
  return {
    title: `${service} Services`,
    description: `Find providers offering ${service.toLowerCase()} services and compare profiles, locations, and pricing.`,
  }
}

export default async function ProvidersByServicePage({ params }: PageProps) {
  const { slug } = await params
  const serviceName = titleFromSlug(slug)
  const supabase = await createClient()
  const services = (await getServices(supabase, 120)).filter((service) =>
    service.title.toLowerCase().includes(serviceName.toLowerCase()),
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
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
    </main>
  )
}
