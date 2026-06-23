import Link from 'next/link'

// Minimal nav for focused sign-up/login moments: just the logo linking home.
// Deliberately NOT the full SiteNav (no search, account menu, or category
// links) — that would be distracting on auth pages.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-50 flex h-16 items-center px-4 sm:px-6">
        <Link href="/" aria-label="Service Pros — back to home" className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-wordmark.png"
            alt="Service Pros"
            className="h-9 w-auto rounded-lg bg-background/80 px-2 py-1 shadow-sm backdrop-blur sm:h-10"
          />
        </Link>
      </header>
      {children}
    </>
  )
}
