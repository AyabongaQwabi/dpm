// Customer sign-in page — Supabase Auth email/password.
// Providers have their own separate entry point at /provider-login.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Icon } from '@/components/ui/Icon'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'
import { PausedFeatureNotice } from '@/components/PausedFeatureNotice'

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string; paused?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, error, paused } = await searchParams

  async function signIn(formData: FormData) {
    'use server'
    if (isFeaturePaused('login')) {
      const params = new URLSearchParams({ paused: '1' })
      if (next) params.set('next', next)
      redirect(`/sign-in?${params}`)
    }
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const params = new URLSearchParams({ error: authError.message })
      if (next) params.set('next', next)
      redirect(`/sign-in?${params}`)
    }

    redirect(next ?? '/customer-account')
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px]">
      {paused && <PausedFeatureNotice message={getFeaturePauseMessage('login')} />}

      {/* ── Left panel — warm community feel ── */}
      <aside className="relative hidden lg:flex flex-col overflow-hidden bg-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/9241709/pexels-photo-9241709.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=800"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top opacity-25"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--primary)/0.92),hsl(var(--primary)/0.70)_50%,hsl(var(--primary)/0.95))]" />
        <div className="craft-rule relative z-10 w-full" aria-hidden="true" />

        <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground w-fit">
            <Icon.sparkle className="h-4 w-4" weight="fill" />
            Proudly South African
          </div>

          <div className="reveal">
            {/* Star rating */}
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Icon.star key={i} className="h-4 w-4 text-accent" weight="fill" />
              ))}
            </div>
            <Icon.quote className="h-7 w-7 text-primary-accent mb-3" weight="fill" />
            <blockquote className="font-display text-xl font-bold leading-snug text-primary-foreground text-balance max-w-sm">
              Found a reliable plumber in 20 minutes. The booking was seamless and the work was perfect.
            </blockquote>
            <p className="mt-4 text-sm text-primary-foreground/60">Naledi K. · Cape Town customer</p>
          </div>

          <div className="reveal reveal-delay-2 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 px-5 py-4 backdrop-blur">
            <p className="text-xs text-primary-foreground/60">
              Are you a provider?{' '}
              <Link href="/provider-login" className="text-primary-accent font-semibold hover:opacity-80 transition-opacity">
                Provider login →
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary mb-3">
              Customer account
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to find and book trusted local professionals.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5">
              <Icon.shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form action={signIn} className="space-y-5">
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
                placeholder="you@example.com"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.99] cursor-pointer"
            >
              Sign in
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </button>
          </form>

          <div className="mt-7 space-y-2.5 text-center text-sm text-muted-foreground">
            <p>
              New to ServicePros?{' '}
              <Link href="/sign-up" className="font-medium text-foreground underline hover:text-primary transition-colors">
                Create a free account
              </Link>
            </p>
            <p>
              Are you a provider?{' '}
              <Link href="/provider-login" className="font-medium text-foreground underline hover:text-primary-accent transition-colors">
                Provider login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
