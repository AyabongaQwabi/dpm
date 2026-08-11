import type { Metadata } from 'next'
import Link from 'next/link'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { formatCredits } from '@/lib/format-credits'
import { getProviderWalletBalance } from '@/lib/actions/provider-wallet'
import { purchaseSponsoredPlacementAction } from '@/lib/actions/sponsored'
import {
  getSponsoredPricing,
  SPONSORED_FLOATING_BOX_DECISIONS,
  SPONSORED_MIN_RATING_THRESHOLD,
  SPONSORED_RESCUE_GRANT_RESERVE_PCT,
  SPONSORED_VISIBLE_SLOTS,
  type SponsoredPlacementType,
} from '@/lib/sponsored-config'

export const metadata: Metadata = {
  title: 'Sponsored placements',
  description: 'Reserve flat-rate sponsored placement slots from your provider wallet.',
}

interface SponsoredPageProps {
  searchParams: Promise<{ status?: string; error?: string; amount?: string }>
}

const PLACEMENTS: Array<{
  type: SponsoredPlacementType
  title: string
  scope: string
  body: string
}> = [
  {
    type: 'category_city_feature',
    title: 'Category-city feature',
    scope: 'Your category and city',
    body: 'A labelled card near the category-city provider grid. It does not move your organic listing.',
  },
  {
    type: 'search_top_slot',
    title: 'Search top slot',
    scope: 'Your category and city',
    body: 'One labelled slot above organic category-city results. Organic order stays unchanged.',
  },
  {
    type: 'floating_box',
    title: 'Floating box',
    scope: 'Site-wide',
    body: 'One dismissible sponsored provider box, rotating hourly across active reservations.',
  },
]

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function placementLabel(type: string): string {
  return type.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function errorMessage(error: string | undefined, amount: string | undefined): string | null {
  switch (error) {
    case 'insufficient_balance':
      return `Your wallet needs ${formatCredits(Number(amount ?? 0))} available for this placement. Top up from Billing, then try again.`
    case 'not_eligible':
      return `Sponsored placements require contact verification, no open disputes, and no average rating below ${SPONSORED_MIN_RATING_THRESHOLD}.`
    case 'reserved_for_rescue_grant':
      return 'Paid inventory is full for that scope because the reserved inventory pool is protected.'
    case 'missing_scope':
      return 'Set your provider category and city before reserving this placement.'
    case 'not_yet_priced':
      return 'This placement is not available for purchase yet.'
    case 'invalid_placement':
      return 'Choose a valid sponsored placement.'
    default:
      return null
  }
}

export default async function SponsoredPlacementsPage({ searchParams }: SponsoredPageProps) {
  const { provider } = await requireProviderSession()
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: providerRow }, { data: placements }, balance] = await Promise.all([
    supabase
      .from('providers')
      .select('verified_contact, location_city, provider_types!inner(name, provider_categories!inner(name))')
      .eq('id', provider.id)
      .single(),
    supabase
      .from('sponsored_placements')
      .select('id, placement_type, category_id, city, starts_at, ends_at, status, price_paid')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(20),
    getProviderWalletBalance(provider.id),
  ])

  const providerType = Array.isArray(providerRow?.provider_types)
    ? providerRow.provider_types[0]
    : providerRow?.provider_types
  const category = Array.isArray(providerType?.provider_categories)
    ? providerType?.provider_categories[0]
    : providerType?.provider_categories
  const scopeLabel = [category?.name, providerRow?.location_city].filter(Boolean).join(' in ')
  const message = errorMessage(params.error, params.amount)

  return (
    <div className="max-w-5xl space-y-8 px-4 py-6 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sponsored placements</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Reserve flat-rate, time-boxed sponsored slots. These are labelled placements and never change organic ranking.
          </p>
        </div>
        <Link
          href="/provider-dashboard/billing"
          className="w-fit rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Wallet: {formatCredits(balance)}
        </Link>
      </div>

      {params.status === 'reserved' && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          Sponsored placement reserved. It is active now and will appear when its rotation slot is selected.
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Placement scope</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Category-city scope</p>
            <p className="mt-1 font-semibold text-foreground">{scopeLabel || 'Complete profile first'}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligibility</p>
            <p className="mt-1 font-semibold text-foreground">
              {providerRow?.verified_contact ? 'Contact verified' : 'Verify contact first'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reserved inventory</p>
            <p className="mt-1 font-semibold text-foreground">{SPONSORED_RESCUE_GRANT_RESERVE_PCT}% protected</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLACEMENTS.map((placement) => {
          const pricing = getSponsoredPricing(placement.type)
          const disabled = !providerRow?.verified_contact || pricing.price === null
          return (
            <form key={placement.type} action={purchaseSponsoredPlacementAction} className="rounded-2xl border border-border bg-card p-5">
              <input type="hidden" name="placementType" value={placement.type} />
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">{placement.scope}</p>
              <h2 className="mt-2 font-display text-lg font-semibold text-foreground">{placement.title}</h2>
              <p className="mt-2 min-h-20 text-sm leading-6 text-muted-foreground">{placement.body}</p>
              <div className="mt-5 rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Flat price</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {pricing.price === null ? 'Coming soon' : `${formatCredits(pricing.price)} / ${pricing.billingUnit}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {SPONSORED_VISIBLE_SLOTS[placement.type]} visible slot, rotated from active reservations.
                </p>
              </div>
              <button
                type="submit"
                disabled={disabled}
                className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reserve {placement.title}
              </button>
            </form>
          )
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Your placements</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recent sponsored reservations for this provider.</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Floating box: {SPONSORED_FLOATING_BOX_DECISIONS.rotation.replaceAll('_', ' ')}
          </p>
        </div>

        {!placements?.length ? (
          <p className="mt-5 text-sm text-muted-foreground">No sponsored placements yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Placement</th>
                  <th className="px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ends</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {placements.map((placement) => (
                  <tr key={placement.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{placementLabel(placement.placement_type)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{placement.city ?? 'Site-wide'}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{placement.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(placement.ends_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {placement.price_paid === null ? '-' : formatCredits(Number(placement.price_paid))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
