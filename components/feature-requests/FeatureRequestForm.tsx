'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitFeatureRequest } from '@/lib/actions/feature-requests'
import {
  FEATURE_REQUEST_AREA_OPTIONS,
  FEATURE_REQUEST_LIMITS,
  FEATURE_REQUEST_ROLE_OPTIONS,
} from '@/lib/feature-requests-config'
import { initialFeatureRequestState } from '@/lib/domain/feature-requests'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/Icon'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-destructive">{message}</p>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? 'Sending...' : 'Send feature request'}
      <Icon.arrowRight className="h-4 w-4" weight="bold" />
    </button>
  )
}

export function FeatureRequestForm() {
  const [state, formAction] = useActionState(submitFeatureRequest, initialFeatureRequestState)
  const [titleLength, setTitleLength] = useState(0)
  const [descriptionLength, setDescriptionLength] = useState(0)

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <input type="hidden" name="sourcePath" value="/feature-requests" />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="companyWebsite">Company website</label>
        <input id="companyWebsite" name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? 'border-primary/30 bg-primary/5 text-foreground'
              : 'border-destructive/30 bg-destructive/5 text-foreground'
          }`}
          role="status"
        >
          {state.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={FEATURE_REQUEST_LIMITS.nameMaxChars}
            autoComplete="name"
            className="mt-1"
          />
          <FieldError message={state.errors.name} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={FEATURE_REQUEST_LIMITS.emailMaxChars}
            autoComplete="email"
            className="mt-1"
          />
          <FieldError message={state.errors.email} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="submitterRole">Are you a...</Label>
          <select
            id="submitterRole"
            name="submitterRole"
            required
            defaultValue=""
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>Choose one</option>
            {FEATURE_REQUEST_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError message={state.errors.submitterRole} />
        </div>
        <div>
          <Label htmlFor="area">Which part of ServicePros?</Label>
          <select
            id="area"
            name="area"
            required
            defaultValue=""
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>Choose an area</option>
            {FEATURE_REQUEST_AREA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError message={state.errors.area} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="title">One-line title</Label>
          <span className="text-xs text-muted-foreground">
            {titleLength}/{FEATURE_REQUEST_LIMITS.titleMaxChars}
          </span>
        </div>
        <Input
          id="title"
          name="title"
          required
          maxLength={FEATURE_REQUEST_LIMITS.titleMaxChars}
          onChange={(event) => setTitleLength(event.currentTarget.value.length)}
          className="mt-1"
        />
        <FieldError message={state.errors.title} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="description">Describe the request</Label>
          <span className="text-xs text-muted-foreground">
            {descriptionLength}/{FEATURE_REQUEST_LIMITS.descriptionMaxChars}
          </span>
        </div>
        <Textarea
          id="description"
          name="description"
          required
          maxLength={FEATURE_REQUEST_LIMITS.descriptionMaxChars}
          rows={8}
          onChange={(event) => setDescriptionLength(event.currentTarget.value.length)}
          className="mt-1 min-h-40"
        />
        <FieldError message={state.errors.description} />
      </div>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          We read every useful request. We may reply if we need more detail.
        </p>
        <SubmitButton />
      </div>
    </form>
  )
}
