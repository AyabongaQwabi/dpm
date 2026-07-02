import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SiteNavUserMenu } from '@/components/SiteNavUserMenu'
import { getNavAuthUser } from '@/lib/nav-auth'

interface SiteNavProps {
  siteName?: string
  logoUrl?: string | null
  location?: { city: string; slug: string } | null
}

export async function SiteNav({ siteName = 'Service Pros', logoUrl, location }: SiteNavProps) {
  const authUser = await getNavAuthUser()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="craft-rule" aria-hidden="true" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center" aria-label={siteName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl ?? '/images/logo-wordmark.png'}
            alt={siteName}
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/search" className="transition-colors hover:text-foreground">Find providers</Link>
          <Link href="/services" className="transition-colors hover:text-foreground">Services</Link>
          <Link href="/feed" className="transition-colors hover:text-foreground">Stories</Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
          <Link href="/get-listed" className="transition-colors hover:text-foreground">Get listed</Link>
          <Link
            href={location ? `/providers/in/${location.slug}` : '/search'}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Icon.pin className="h-4 w-4" />
            {location ? location.city : 'Near you'}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search providers"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-card hover:bg-muted md:hidden"
          >
            <Icon.search className="h-[18px] w-[18px]" />
          </Link>
          <ThemeToggle />
          {authUser ? (
            <>
              <Link
                href={authUser.creditsHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-accent px-3 py-2 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90 sm:px-3.5"
              >
                <span className="sm:hidden">Credits</span>
                <span className="hidden sm:inline">Buy credits</span>
                <Icon.arrowRight className="hidden h-4 w-4 sm:block" weight="bold" />
              </Link>
              <Link
                href={authUser.dashboardHref}
                className="inline-flex rounded-xl border px-2.5 py-2 text-xs font-medium hover:bg-muted sm:px-3 sm:text-sm"
              >
                Dashboard
              </Link>
              <SiteNavUserMenu
                initial={authUser.initial}
                email={authUser.email}
              />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden rounded-xl border px-3 py-2 text-sm hover:bg-muted sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-accent px-3.5 py-2 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                Join
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
