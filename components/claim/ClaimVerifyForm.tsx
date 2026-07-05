'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { verifyClaim } from '@/lib/actions/claims'

interface Props {
  slug: string
  businessName: string
}

export function ClaimVerifyForm({ slug, businessName }: Props) {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await verifyClaim(slug, code, email)
    if (result && !result.ok) {
      setError(result.error ?? 'Verification failed.')
      setPending(false)
    }
  }

  if (!email) {
    return (
      <p className="text-sm text-muted-foreground">
        Missing email. <Link href={`/claim/${slug}`} className="text-primary-accent underline">Start the claim again</Link>.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to <strong>{email}</strong> for <strong>{businessName}</strong>.
      </p>
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1.5">
          Verification code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm tracking-[0.3em] text-center text-lg font-mono"
          placeholder="000000"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? 'Verifying…' : 'Verify and claim profile'}
      </button>
      <p className="text-xs text-muted-foreground">
        <Link href={`/claim/${slug}`} className="underline hover:text-foreground">Request a new code</Link>
      </p>
    </form>
  )
}
