'use client'

import { useState } from 'react'
import { requestContactVerification, verifyContactCode } from '@/lib/actions/verification'

interface Props {
  email: string
  alreadyVerified: boolean
  hasPendingCode: boolean
}

export function ContactVerificationCard({ email, alreadyVerified, hasPendingCode }: Props) {
  const [sent, setSent] = useState(hasPendingCode)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(alreadyVerified)

  async function handleSendCode() {
    setLoading(true)
    setError(null)
    const result = await requestContactVerification()
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not send code.')
      return
    }
    setSent(true)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await verifyContactCode(code)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Invalid code.')
      return
    }
    setVerified(true)
  }

  if (verified) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
        Your contact email (<strong>{email}</strong>) is verified.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        We&apos;ll send a 6-digit code to <strong>{email}</strong> — the email you sign in with.
      </p>

      {!sent ? (
        <button
          type="button"
          onClick={handleSendCode}
          disabled={loading}
          className="rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send verification code'}
        </button>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="contact-code" className="block text-xs font-medium text-muted-foreground mb-1">
              6-digit code
            </label>
            <input
              id="contact-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-32 rounded-lg border border-input bg-card px-3 py-2 text-sm tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="000000"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
