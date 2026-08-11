import { FloatingSponsoredBox } from '@/components/sponsored/FloatingSponsoredBox'
import { getFloatingSponsoredProvider } from '@/lib/public-data'
import { SPONSORED_FLOATING_BOX_DISMISSAL_HOURS } from '@/lib/sponsored-config'
import { createClient } from '@/lib/supabase/server'

export async function FloatingSponsoredPlacement() {
  const supabase = await createClient()
  const provider = await getFloatingSponsoredProvider(supabase)

  if (!provider) return null

  return (
    <FloatingSponsoredBox
      provider={provider}
      dismissalHours={SPONSORED_FLOATING_BOX_DISMISSAL_HOURS}
    />
  )
}
