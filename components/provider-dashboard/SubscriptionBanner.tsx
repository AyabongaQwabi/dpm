import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

interface Props {
  status: 'expired' | 'expiring' | null
  daysRemaining: number
}

/** Non-blocking payment-due warning shown across the provider dashboard. */
export function SubscriptionBanner({ status, daysRemaining }: Props) {
  if (!status) return null

  const isExpired = status === 'expired'

  return (
    <div
      className={
        isExpired
          ? 'border-b border-destructive/30 bg-destructive/10'
          : 'border-b border-amber-500/30 bg-amber-500/10'
      }
    >
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon.shield
            className={isExpired ? 'w-4 h-4 text-destructive shrink-0' : 'w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0'}
          />
          <p className={isExpired ? 'text-sm text-destructive' : 'text-sm text-amber-800 dark:text-amber-200'}>
            {isExpired
              ? 'Your subscription payment is overdue — your profile is hidden from customers.'
              : `Your subscription renews in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — make sure your payment is up to date.`}
          </p>
        </div>
        <Link
          href="/provider-dashboard/billing"
          className={
            isExpired
              ? 'shrink-0 text-xs font-semibold text-destructive underline underline-offset-2 hover:no-underline'
              : 'shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:no-underline'
          }
        >
          Go to billing →
        </Link>
      </div>
    </div>
  )
}
