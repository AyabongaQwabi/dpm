import { redirect } from 'next/navigation'

interface WalletPageProps {
  searchParams: Promise<{ amount?: string; status?: string; reference?: string }>
}

export default async function ProviderWalletRedirect({ searchParams }: WalletPageProps) {
  const params = await searchParams
  const next = new URLSearchParams()
  if (params.amount) next.set('amount', params.amount)
  if (params.status) next.set('status', params.status)
  if (params.reference) next.set('reference', params.reference)

  redirect(`/provider-dashboard/billing${next.toString() ? `?${next.toString()}` : ''}`)
}
