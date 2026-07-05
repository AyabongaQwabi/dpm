import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ClaimVerifyForm } from '@/components/claim/ClaimVerifyForm'

interface VerifyPageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Verify business claim',
  robots: { index: false, follow: false },
}

async function getClaimableProvider(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select('id, slug, business_name, claim_status')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .in('claim_status', ['unclaimed', 'claim_pending'])
    .single()
  return data
}

export default async function ClaimVerifyPage({ params }: VerifyPageProps) {
  const { slug } = await params
  const provider = await getClaimableProvider(slug)
  if (!provider) notFound()

  const profileSlug = provider.slug ?? provider.id

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Link href={`/claim/${profileSlug}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold text-foreground">Verify your claim</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-muted-foreground">Loading…</p>}>
        <ClaimVerifyForm slug={profileSlug} businessName={provider.business_name} />
      </Suspense>
    </main>
  )
}
