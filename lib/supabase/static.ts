import { createClient } from '@supabase/supabase-js'

/** Anonymous Supabase client for build-time static generation (no request cookies). */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
