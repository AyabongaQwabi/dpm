'use client'

import { useFormStatus } from 'react-dom'

export function FormSubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
