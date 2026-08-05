// ARCH-003/1.2: session-to-entity resolution for authenticated dashboard routes.
// Resolves a Supabase Auth user ID to the corresponding Provider or Customer
// record via the auth_provider_id field (schema doc Section 2.1 / 6.1).
//
// Usage in Server Components and Route Handlers — never call from Client Components.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ---- Provider session resolution ----

export interface ProviderSession {
  authUserId: string
  provider: {
    id: string
    onboarding_step: number
    is_published: boolean
    provider_type_id: string
    business_name: string
  }
}

/**
 * Resolves the current Supabase session to a Provider record.
 *
 * - If there is no active session: redirects to /sign-in.
 * - If the session exists but no Provider row has this auth_provider_id yet
 *   (brand-new signup): redirects to /provider-dashboard/onboarding so they
 *   can create their profile. The caller does not need to handle this case.
 * - If a Provider record is found: returns it.
 *
 * Call this at the top of every provider-dashboard Server Component or Route Handler.
 */
export async function requireProviderSession(): Promise<ProviderSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('id, onboarding_step, is_published, provider_type_id, business_name')
    .eq('auth_provider_id', user.id)
    .single()

  if (!provider) {
    // Authenticated but no provider profile yet — send them to start onboarding.
    redirect('/provider-dashboard/onboarding')
  }

  return { authUserId: user.id, provider }
}

// ---- Customer session resolution ----

export interface CustomerSession {
  authUserId: string
  customer: {
    id: string
    name: string
    email: string
    phone: string | null
  }
}

/**
 * Resolves the current Supabase session to a Customer record.
 *
 * - If there is no active session: redirects to /sign-in.
 * - If a Customer record is found: returns it.
 *
 * Call this at the top of every customer-account Server Component or Route Handler.
 */
export async function requireCustomerSession(): Promise<CustomerSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('auth_provider_id', user.id)
    .single()

  if (!customer) {
    // Authenticated but no customer record — should not happen in normal flow
    // since customer rows are created at sign-up, but handle gracefully.
    redirect('/sign-up')
  }

  return { authUserId: user.id, customer }
}

// ---- Admin session resolution ----

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Resolves the current Supabase session to an admin operator.
 *
 * Admins are not a database table — they are an env-configured allowlist
 * (ADMIN_EMAILS, comma-separated) checked against the authenticated user's
 * email. Redirects to /sign-in if unauthenticated, notFound() if the
 * authenticated user is not an admin (so the route surface doesn't leak).
 *
 * Call this at the top of every app/admin Server Component or Route Handler.
 */
export async function requireAdminSession(): Promise<{ authUserId: string; email: string }> {
  const { notFound } = await import('next/navigation')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const email = user.email?.toLowerCase() ?? ''
  if (!email || !adminEmails().includes(email)) {
    notFound()
  }

  return { authUserId: user.id, email }
}

/**
 * Returns the current session user without throwing or redirecting.
 * Use in layouts or components that need to branch on auth state but
 * should not force a redirect (e.g. nav showing sign-in vs. avatar).
 */
export async function getOptionalUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
