import { cookies } from 'next/headers'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteNav } from '@/components/SiteNav'
import { GeoLocationResolver } from '@/components/GeoLocationResolver'
import { FloatingSponsoredPlacement } from '@/components/sponsored/FloatingSponsoredPlacement'
import { getTenantContext, getUserLocation, USER_CITY_COOKIE } from '@/lib/tenant'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [tenant, location, cookieStore] = await Promise.all([getTenantContext(), getUserLocation(), cookies()])
  const hasStoredLocation = Boolean(cookieStore.get(USER_CITY_COOKIE)?.value)

  return (
    <>
      <GeoLocationResolver hasStoredLocation={hasStoredLocation} />
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
