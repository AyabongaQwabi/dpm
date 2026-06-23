import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProviderSession } from '@/lib/session'
import type { DiscountType } from '@/lib/db'

function displayPrice(price: number, discountType: DiscountType, discountAmount: number | null) {
  if (discountType === 'none' || discountAmount === null) return price
  if (discountType === 'amount') return price - discountAmount
  return price * (1 - discountAmount / 100)
}

export default async function ServicesPage() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { data: services } = await supabase
    .from('services')
    .select(`
      id, title, description, image, is_published, service_type,
      service_packages(id, price, discount_type, discount_amount, is_default, name)
    `)
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: true })

  const serviceList = (services ?? []) as {
    id: string
    title: string
    description: string
    image: string | null
    is_published: boolean
    service_type: string
    service_packages: {
      id: string
      price: number
      discount_type: DiscountType
      discount_amount: number | null
      is_default: boolean
      name: string
    }[]
  }[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Services</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Each service needs an article and at least one pricing package before it can be published.
          </p>
        </div>
        <Link
          href="/provider-dashboard/services/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          + Add service
        </Link>
      </div>

      {serviceList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No services yet.</p>
          <Link
            href="/provider-dashboard/services/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Create your first service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {serviceList.map((svc) => {
            const packages = Array.isArray(svc.service_packages) ? svc.service_packages : []
            const defaultPkg = packages.find((p) => p.is_default) ?? packages[0]
            const finalPrice = defaultPkg
              ? displayPrice(Number(defaultPkg.price), defaultPkg.discount_type, defaultPkg.discount_amount ? Number(defaultPkg.discount_amount) : null)
              : null

            return (
              <Link
                key={svc.id}
                href={`/provider-dashboard/services/${svc.id}`}
                className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 hover:bg-accent/30 transition-colors"
              >
                {svc.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={svc.image}
                    alt={svc.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{svc.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {packages.length > 0
                      ? `${packages.length} package${packages.length !== 1 ? 's' : ''} · from R ${Number(defaultPkg?.price ?? 0).toFixed(2)}`
                      : 'No packages yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    svc.is_published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700',
                  ].join(' ')}>
                    {svc.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-muted-foreground/50 text-xs">Edit →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
