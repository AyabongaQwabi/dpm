import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Icon } from '@/components/ui/Icon'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'
import { PausedFeatureNotice } from '@/components/PausedFeatureNotice'

interface ProviderSignupPageProps {
  searchParams: Promise<{ error?: string; paused?: string }>
}

export default async function ProviderSignupPage({ searchParams }: ProviderSignupPageProps) {
  const { error, paused } = await searchParams

  async function signUpProvider(formData: FormData) {
    'use server'
    if (isFeaturePaused('signUp')) {
      redirect('/provider-signup?paused=1')
    }
    const supabase = await createClient()
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const businessType = formData.get('businessType') as string
    const agreedToProviderTerms = formData.get('agreedToProviderTerms')

    if (!agreedToProviderTerms) {
      redirect('/provider-signup?error=' + encodeURIComponent('You must agree to the Provider Terms to continue.'))
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'provider', business_type: businessType } },
    })

    if (authError) redirect(`/provider-signup?error=${encodeURIComponent(authError.message)}`)
    redirect('/provider-dashboard/onboarding')
  }

  const businessTypes = [
    { value: 'entrepreneur', label: 'Sole proprietor', description: 'Individual freelancer or self-employed' },
    { value: 'co-op', label: 'Co-operative', description: 'Member-owned collective business' },
    { value: 'company', label: 'Registered company', description: 'Pty Ltd or incorporated business' },
    { value: 'non-profit', label: 'Non-profit org', description: 'NPO, NGO or community enterprise' },
  ]

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_560px]">
      {paused && <PausedFeatureNotice message={getFeaturePauseMessage('signUp')} />}

      {/* ── Left panel — Highveld brand panel ── */}
      <aside className="relative hidden lg:flex flex-col overflow-hidden bg-primary">
        {/* Art-directed background — same treatment as HeroSection */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/8487390/pexels-photo-8487390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=800"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
        />
        {/* Same gradient direction as HeroSection */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--primary)/0.92),hsl(var(--primary)/0.70)_50%,hsl(var(--primary)/0.95))]" />

        {/* craft-rule strip at top — brand signature */}
        <div className="craft-rule relative z-10 w-full" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col px-10 py-10">
          {/* Badge — mirrors HeroSection pill */}
          <div className="mb-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground">
              <Icon.verified className="h-4 w-4" weight="fill" />
              Proudly South African provider network
            </div>
          </div>

          {/* Testimonial */}
          <div className="reveal">
            <Icon.quote className="h-8 w-8 text-primary-accent mb-4" weight="fill" />
            <blockquote className="font-display text-2xl font-bold leading-snug text-primary-foreground text-balance max-w-sm">
              I went from chasing jobs to turning clients away. ServicePros changed everything.
            </blockquote>
            <footer className="mt-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-accent/30 ring-2 ring-primary-accent/50 flex items-center justify-center font-display text-sm font-bold text-primary-accent-foreground">
                TM
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Thabo M.</p>
                <p className="text-xs text-primary-foreground/60">Plumber · Johannesburg · 3 years listed</p>
              </div>
            </footer>
          </div>

          {/* Stats strip — matches hero widget style */}
          <div className="mt-10 reveal reveal-delay-2 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur">
            <div className="grid grid-cols-3 gap-4 divide-x divide-primary-foreground/15">
              {[
                { stat: '12 000+', label: 'Active providers' },
                { stat: 'R2.4M', label: 'Paid out monthly' },
                { stat: '4.8★', label: 'Provider rating' },
              ].map((t) => (
                <div key={t.stat} className="px-4 first:pl-0 last:pr-0">
                  <p className="font-mono text-xl font-semibold text-primary-foreground">{t.stat}</p>
                  <p className="mt-0.5 text-xs text-primary-foreground/60">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* craft-rule at bottom */}
        <div className="craft-rule relative z-10 w-full" aria-hidden="true" />
      </aside>

      {/* ── Right panel — form ── */}
      <div className="flex min-h-screen flex-col bg-background px-5 pt-24 pb-10 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-wordmark.png" alt="Service Pros" className="h-8 w-auto" />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          {/* Heading */}
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent mb-3">
              <Icon.sparkle className="h-3.5 w-3.5" weight="fill" />
              Free to list — no setup fees
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Get your business listed
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Start receiving real bookings in minutes.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5">
              <Icon.shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form action={signUpProvider} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Your name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="e.g. Sipho Dlamini"
                className="w-full rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Business email <span className="text-destructive">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@yourbusiness.co.za"
                className="w-full rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password <span className="text-destructive">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="8+ characters"
                className="w-full rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            {/* Business type */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                Business type <span className="text-destructive">*</span>
              </legend>
              <div className="grid grid-cols-2 gap-2.5">
                {businessTypes.map((bt, i) => (
                  <label
                    key={bt.value}
                    className="group flex flex-col gap-0.5 rounded-[var(--radius)] border border-border bg-card px-3.5 py-3 cursor-pointer transition-all duration-150 hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:border-primary-accent has-[:checked]:bg-primary-accent/10 has-[:checked]:ring-1 has-[:checked]:ring-primary-accent"
                  >
                    <input
                      type="radio"
                      name="businessType"
                      value={bt.value}
                      required
                      defaultChecked={i === 0}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-foreground leading-tight">{bt.label}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{bt.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Consent */}
            <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="agreedToProviderTerms"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary-accent focus:ring-ring"
              />
              <span>
                I agree to the{' '}
                <Link href="/provider-terms" target="_blank" className="text-primary hover:underline">
                  Provider Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary-accent px-4 py-3 text-sm font-semibold text-primary-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.99] cursor-pointer"
            >
              Create provider account
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </button>
          </form>

          {/* Microcopy */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Icon.shield className="h-3.5 w-3.5 text-muted-foreground/50" />
            Free to list · No hidden fees · Cancel anytime
          </div>

          {/* Footer links */}
          <div className="mt-8 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Already listed?{' '}
              <Link href="/provider-login" className="font-medium text-foreground underline hover:text-primary-accent transition-colors">
                Sign in to your provider account
              </Link>
            </p>
            <p>
              Want to learn more first?{' '}
              <Link href="/get-listed" className="font-medium text-foreground underline hover:text-primary-accent transition-colors">
                Why join ServicePros
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
