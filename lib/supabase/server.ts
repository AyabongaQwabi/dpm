import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Use in Server Components, Route Handlers, and Server Actions.
// Reads/writes the auth session from the request cookie store.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll is called from Server Components where cookies cannot be set.
            // Safe to ignore — the session will be refreshed by the Route Handler middleware.
          }
        },
      },
    },
  )
}
