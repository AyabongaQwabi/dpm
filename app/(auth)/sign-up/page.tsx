// Customer sign-up page — Supabase Auth email/password.
// Providers register through the separate /provider-signup flow.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'
import { PausedFeatureNotice } from '@/components/PausedFeatureNotice'
import { enqueueNurtureSequence, processImmediateNurtureWelcome } from '@/lib/actions/nurture-emails'

interface SignUpPageProps {
  searchParams: Promise<{ error?: string; paused?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error, paused } = await searchParams

  async function signUp(formData: FormData) {
    'use server'
    if (isFeaturePaused('signUp')) {
      redirect('/sign-up?paused=1')
    }
    const supabase = await createClient()
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'customer' } },
    })

    if (authError || !data.user) {
      const msg = authError?.message ?? 'Sign up failed'
      redirect(`/sign-up?error=${encodeURIComponent(msg)}`)
    }

    const admin = createAdminClient()
    const { data: customer } = await admin.from('customers').upsert(
      { auth_provider_id: data.user.id, email, name },
      { onConflict: 'auth_provider_id' },
    ).select('id, email, name').single()

    if (customer) {
      await enqueueNurtureSequence({
        audience: 'customer',
        recipientId: customer.id,
        email: customer.email,
        name: customer.name,
      })
      await processImmediateNurtureWelcome('customer', customer.id)
    }
    redirect('/customer-account')
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {paused && <PausedFeatureNotice message={getFeaturePauseMessage('signUp')} />}
      <aside className="relative hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/auth-customer.png"
          alt="A homeowner welcoming a trusted local service professional"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-primary-foreground">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">Service Pros</p>
          <h2 className="mt-3 max-w-md text-3xl font-bold tracking-tight text-balance">
            Join thousands booking trusted local pros every day.
          </h2>
        </div>
      </aside>

      <div className="flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">Service Pros</Link>
          <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">Customer</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
        <p className="mb-6 text-sm text-muted-foreground">Join Service Pros as a customer.</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <form action={signUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-accent text-primary-accent-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
          >
            Create account
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-sm text-center text-muted-foreground">
          Want to offer services?{' '}
          <Link href="/provider-signup" className="font-medium text-foreground underline underline-offset-4">
            Join as a provider
          </Link>
        </p>
        </div>
      </div>
    </main>
  )
}
