import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import {
  saveServiceArticle,
  updateServiceMeta,
  updateServiceImage,
  upsertPackage,
  deletePackage,
  setDefaultPackage,
  publishService,
  unpublishService,
  deleteService,
} from '@/lib/actions/services'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ServiceArticleEditor } from '@/components/provider-dashboard/ServiceArticleEditor'
import { ServiceImageUpload } from '@/components/provider-dashboard/ServiceImageUpload'
import { PackageFormClient } from '@/components/provider-dashboard/PackageFormClient'
import type { DiscountType } from '@/lib/db'
import { SERVICE_PACKAGE_TITLE_GUIDANCE } from '@/lib/service-package-rules'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ packageError?: string }>
}

const PACKAGE_ERRORS: Record<string, string> = {
  title: SERVICE_PACKAGE_TITLE_GUIDANCE,
  price: 'Package price must be zero or more.',
}

export default async function ServiceEditorPage({ params, searchParams }: PageProps) {
  const { id: serviceId } = await params
  const { packageError } = await searchParams
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select(`
      id, title, description, image, is_published, service_type,
      article_json, article_text,
      service_packages(id, name, description, price, discount_type, discount_amount, offerings, requirements, requirement_file_slots, delivery_time, is_default, display_order)
    `)
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!service) notFound()

  const packages = (Array.isArray(service.service_packages)
    ? service.service_packages
    : []) as {
    id: string
    name: string
    description: string
    price: number
    discount_type: DiscountType
    discount_amount: number | null
    offerings: string[]
    requirements: string
    requirement_file_slots: { name: string }[]
    delivery_time: string
    is_default: boolean
    display_order: number
  }[]

  packages.sort((a, b) => a.display_order - b.display_order)

  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  const hasBookings = (bookingCount ?? 0) > 0
  const canPublish = !!service.article_json && packages.length > 0

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{service.title}</h1>
            <Badge
              variant="secondary"
              className={service.is_published
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'}
            >
              {service.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{service.description}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {service.is_published ? (
            <form action={unpublishService}>
              <input type="hidden" name="serviceId" value={serviceId} />
              <button
                type="submit"
                className="text-xs border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={publishService}>
              <input type="hidden" name="serviceId" value={serviceId} />
              <button
                type="submit"
                disabled={!canPublish}
                title={!canPublish ? 'Add an article and at least one package before publishing' : undefined}
                className="text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Publish
              </button>
            </form>
          )}
        </div>
      </div>

      {!canPublish && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Not publishable yet</strong> — this service needs{' '}
          {!service.article_json && 'a written article'}
          {!service.article_json && packages.length === 0 && ' and '}
          {packages.length === 0 && 'at least one pricing package'}
          {' '}before it can go live.
        </div>
      )}

      {/* Service meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateServiceMeta} className="space-y-4">
            <input type="hidden" name="serviceId" value={serviceId} />
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={service.title}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="description">Short description</label>
              <textarea
                id="description"
                name="description"
                required
                rows={2}
                defaultValue={service.description}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-y"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="serviceType">Booking type</label>
              <select
                id="serviceType"
                name="serviceType"
                defaultValue={service.service_type}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="fixed_deliverable">Order / Get Started (fixed deliverable)</option>
                <option value="time_based">Book / Request to Book (time-based)</option>
              </select>
            </div>
            <button
              type="submit"
              className="text-sm bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save changes
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Cover image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cover image</CardTitle>
          <CardDescription>Shown at the top of your service page and in listings.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceImageUpload
            serviceId={serviceId}
            currentImage={service.image ?? null}
            action={updateServiceImage}
          />
        </CardContent>
      </Card>

      {/* Article editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Service article
            {!service.article_json && (
              <span className="ml-2 text-xs font-normal text-destructive">(required to publish)</span>
            )}
          </CardTitle>
          <CardDescription>
            Write a compelling explainer. Upload or embed images, and embed YouTube videos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceArticleEditor
            serviceId={serviceId}
            initialJson={service.article_json}
            saveAction={saveServiceArticle}
          />
        </CardContent>
      </Card>

      {/* Pricing packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pricing packages
            {packages.length === 0 && (
              <span className="ml-2 text-xs font-normal text-destructive">(required to publish)</span>
            )}
          </CardTitle>
          <CardDescription>
            Add one or more packages. Mark one as default — its price shows on service cards and listings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {packageError && PACKAGE_ERRORS[packageError] && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {PACKAGE_ERRORS[packageError]}
            </p>
          )}

          {/* Existing packages */}
          {packages.map((pkg) => (
            <details key={pkg.id} className="border rounded-xl overflow-hidden group">
              <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{pkg.name}</span>
                    {pkg.is_default && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {(() => {
                      const finalPrice = pkg.discount_type === 'amount' && pkg.discount_amount
                        ? Number(pkg.price) - Number(pkg.discount_amount)
                        : pkg.discount_type === 'percent' && pkg.discount_amount
                          ? Number(pkg.price) * (1 - Number(pkg.discount_amount) / 100)
                          : Number(pkg.price)
                      return (
                        <>
                          R {finalPrice.toFixed(2)}
                          {pkg.discount_type !== 'none' && (
                            <span className="ml-2 line-through text-muted-foreground/60">R {Number(pkg.price).toFixed(2)}</span>
                          )}
                          {pkg.delivery_time && ` · ${pkg.delivery_time}`}
                        </>
                      )
                    })()}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground/60 group-open:hidden">Edit ▾</span>
                <span className="text-xs text-muted-foreground/60 hidden group-open:inline">Close ▴</span>
              </summary>
              <div className="border-t px-5 pb-5 pt-4 space-y-4">
                <PackageFormClient
                  serviceId={serviceId}
                  packageId={pkg.id}
                  action={upsertPackage}
                  defaults={pkg}
                  submitLabel="Save changes"
                />
                <div className="flex items-center gap-4 pt-2 border-t">
                  {!pkg.is_default && (
                    <form action={setDefaultPackage}>
                      <input type="hidden" name="serviceId" value={serviceId} />
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <button type="submit" className="text-xs text-primary hover:underline cursor-pointer">
                        Set as default
                      </button>
                    </form>
                  )}
                  <form action={deletePackage}>
                    <input type="hidden" name="serviceId" value={serviceId} />
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <button type="submit" className="text-xs text-destructive hover:underline cursor-pointer">
                      Delete package
                    </button>
                  </form>
                </div>
              </div>
            </details>
          ))}

          {/* Add new package form */}
          <details className="border rounded-xl overflow-hidden group">
            <summary className="px-5 py-3 cursor-pointer list-none font-medium text-sm text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
              + Add package
            </summary>
            <div className="px-5 pb-5 pt-4">
              <PackageFormClient
                serviceId={serviceId}
                action={upsertPackage}
                isFirstPackage={packages.length === 0}
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Delete service</CardTitle>
        </CardHeader>
        <CardContent>
          {hasBookings ? (
            <p className="text-sm text-muted-foreground">
              This service cannot be deleted because it has existing bookings.
            </p>
          ) : (
            <form action={deleteService}>
              <input type="hidden" name="serviceId" value={serviceId} />
              <button
                type="submit"
                className="text-sm text-destructive border border-destructive/40 rounded-lg px-4 py-2 hover:bg-destructive/5 transition-colors cursor-pointer"
              >
                Delete this service permanently
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
