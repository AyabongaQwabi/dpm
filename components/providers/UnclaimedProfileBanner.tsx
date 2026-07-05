import Link from 'next/link'

interface Props {
  slug: string
  status: 'unclaimed' | 'claim_pending'
}

export function UnclaimedProfileBanner({ slug, status }: Props) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {status === 'claim_pending' ? 'Claim in progress' : 'Unverified listing'}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {status === 'claim_pending'
              ? 'Someone is verifying ownership of this business.'
              : 'This profile was added from public information and has not been claimed by the owner.'}
          </p>
        </div>
        {status === 'unclaimed' && (
          <Link
            href={`/claim/${slug}`}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Is this your business? Claim this profile
          </Link>
        )}
      </div>
    </div>
  )
}
