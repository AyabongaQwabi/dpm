import { SiteFooter } from '@/components/SiteFooter'
import { SiteNav } from '@/components/SiteNav'
import { FloatingSponsoredPlacement } from '@/components/sponsored/FloatingSponsoredPlacement'
import { getTenantContext, getUserLocation } from '@/lib/tenant'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [tenant, location] = await Promise.all([getTenantContext(), getUserLocation()])

  return (
    <>
      <SiteNav
        siteName={tenant.branding?.siteName ?? 'Service Pros'}
        logoUrl={tenant.branding?.logoUrl ?? null}
        location={location}
      />
      <div className="flex-1">{children}</div>
      <FloatingSponsoredPlacement />
      <SiteFooter />
    </>
  )
}
