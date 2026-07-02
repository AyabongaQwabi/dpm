import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type NavUserType = 'provider' | 'customer' | 'none'

export interface NavAuthUser {
  email: string
  initial: string
  userType: NavUserType
  dashboardHref: string
  creditsHref: string
}

function getMetadataRole(user: User): NavUserType | null {
  const role = user.user_metadata?.role
  if (role === 'provider' || role === 'customer') return role
  return null
}

function getDisplayInitial(user: User): string {
  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''
  if (name) return name.charAt(0).toUpperCase()
  const email = user.email?.trim()
  if (email) return email.charAt(0).toUpperCase()
  return '?'
}

function dashboardHrefFor(userType: NavUserType): string {
  switch (userType) {
    case 'provider':
      return '/provider-dashboard'
    case 'customer':
      return '/customer-account'
    default:
      return '/sign-up'
  }
}

function creditsHrefFor(userType: NavUserType): string {
  return userType === 'customer' ? '/customer-account/credits' : '/pricing'
}

/**
 * Resolves navbar auth state for the current session.
 * Prefers user_metadata.role when set; falls back to providers/customers lookup.
 */
export async function getNavAuthUser(): Promise<NavAuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const metadataRole = getMetadataRole(user)

  const [{ data: provider }, { data: customer }] = await Promise.all([
    supabase.from('providers').select('id').eq('auth_provider_id', user.id).maybeSingle(),
    supabase.from('customers').select('id').eq('auth_provider_id', user.id).maybeSingle(),
  ])

  let userType: NavUserType = 'none'
  let dashboardHref = '/sign-up'

  if (provider) {
    userType = 'provider'
    dashboardHref = '/provider-dashboard'
  } else if (customer) {
    userType = 'customer'
    dashboardHref = '/customer-account'
  } else if (metadataRole === 'provider') {
    userType = 'provider'
    dashboardHref = '/provider-dashboard/onboarding'
  } else if (metadataRole === 'customer') {
    userType = 'customer'
    dashboardHref = '/sign-up'
  }

  return {
    email: user.email ?? '',
    initial: getDisplayInitial(user),
    userType,
    dashboardHref,
    creditsHref: creditsHrefFor(userType === 'none' ? (metadataRole ?? 'none') : userType),
  }
}
