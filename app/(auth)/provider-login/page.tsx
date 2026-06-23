import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Icon } from '@/components/ui/Icon'

interface ProviderLoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function ProviderLoginPage({ searchParams }: ProviderLoginPageProps) {
  const { error } = await searchParams

  async function signInProvider(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) redirect(`/provider-login?error=${encodeURIComponent(authError.message)}`)
    redirect('/provider-dashboard/onboarding')
  }

  const valueProps = [
    { icon: Icon.verified, text: 'Real bookings, not just leads' },
    { icon: Icon.shield, text: 'Secure payments through the platform' },
    { icon: Icon.sparkle, text: 'Commission that rewards loyalty' },
    { icon: Icon.pin, text: 'Your listing found on Google and AI search' },
  ]

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px]">

      {/* ── Left panel ── */}
      <aside className="relative hidden lg:flex flex-col overflow-hidden bg-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/8487390/pexels-photo-8487390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=800"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--primary)/0.92),hsl(var(--primary)/0.70)_50%,hsl(var(--primary)/0.95))]" />
        <div className="craft-rule relative z-10 w-full" aria-hidden="true" />

        <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground mb-8">
              <Icon.verified className="h-4 w-4" weight="fill" />
              Provider workspace
            </div>
            <h2 className="font-display text-2xl font-bold text-primary-foreground text-balance leading-snug mb-6">
              Everything you need to grow your service business.
            </h2>
            <ul className="space-y-4">
              {valueProps.map(({ icon: Glyph, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-accent/20 ring-1 ring-primary-accent/30 flex-shrink-0">
                    <Glyph className="h-4 w-4 text-primary-accent" weight="duotone" />
                  </span>
                  <span className="text-sm text-primary-foreground/85">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 px-5 py-4 backdrop-blur">
            <p className="text-xs text-primary-foreground/60">
              Not yet listed?{' '}
              <Link href="/provider-signup" className="text-primary-accent font-semibold hover:opacity-80 transition-opacity">
                Create your provider account →
              </Link>
            </p>
          </div>
        </div>

        <div className="craft-rule relative z-10 w-full" aria-hidden="true" />
      </aside>

      {/* ── Right panel ── */}
      <div className="flex min-h-screen flex-col bg-background px-5 pt-24 pb-10 sm:px-10">
        <div className="mb-8 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-wordmark.png" alt="Service Pros" className="h-8 w-auto" />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent mb-3">
              <Icon.verified className="h-3.5 w-3.5" weight="fill" />
              Provider account
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Sign in to your workspace
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Manage your bookings, profile, and earnings.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5">
              <Icon.shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form action={signInProvider} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@yourbusiness.co.za"
                className="w-full rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary-accent px-4 py-3 text-sm font-semibold text-primary-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.99] cursor-pointer"
            >
              Sign in to provider account
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </button>
          </form>

          <div className="mt-7 space-y-2.5 text-center text-sm text-muted-foreground">
            <p>
              New provider?{' '}
              <Link href="/provider-signup" className="font-medium text-foreground underline hover:text-primary-accent transition-colors">
                Create a free account
              </Link>
            </p>
            <p>
              Looking for a service?{' '}
              <Link href="/sign-in" className="font-medium text-foreground underline hover:text-primary transition-colors">
                Customer sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
