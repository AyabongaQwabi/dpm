'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DiscountType } from '@/lib/db'
import {
  SERVICE_PACKAGE_TITLE_ALLOWED_PATTERN,
  SERVICE_PACKAGE_TITLE_GUIDANCE,
  SERVICE_PACKAGE_TITLE_MAX_CHARS,
  SERVICE_PACKAGE_TITLE_MAX_WORDS,
} from '@/lib/service-package-rules'

interface Props {
  serviceId: string
  packageId?: string
  action: (fd: FormData) => Promise<void>
  defaults?: {
    name: string
    description: string
    price: number
    discount_type: DiscountType
    discount_amount: number | null
    offerings: string[]
    requirements: string
    requirement_file_slots: { name: string }[]
    delivery_time: string
    is_default: boolean
    display_order: number
  }
  submitLabel?: string
  isFirstPackage?: boolean
  onSaved?: () => void
}

function ItemList({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  addLabel: string
}) {
  function update(i: number, val: string) {
    onChange(items.map((item, idx) => (idx === i ? val : item)))
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  function add() {
    onChange([...items, ''])
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded-full w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            aria-label="Remove item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary-accent/40 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent hover:bg-primary-accent/20 transition-colors cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {addLabel}
      </button>
    </div>
  )
}

export function PackageFormClient({
  serviceId,
  packageId,
  action,
  defaults,
  submitLabel,
  isFirstPackage = false,
  onSaved,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [offerings, setOfferings] = useState<string[]>(defaults?.offerings ?? [])
  const [fileSlots, setFileSlots] = useState<string[]>(
    defaults?.requirement_file_slots?.map((s) => s.name) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [hasSavedNewPackage, setHasSavedNewPackage] = useState(false)
  const [name, setName] = useState(defaults?.name ?? '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = submitter?.value === 'add_another' ? 'add_another' : 'save'
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    // Replace textarea values with JSON arrays
    fd.delete('offeringsRaw')
    fd.delete('fileSlotsRaw')
    fd.set('offeringsJson', JSON.stringify(offerings.filter((o) => o.trim())))
    fd.set('fileSlotsJson', JSON.stringify(fileSlots.filter((s) => s.trim())))
    try {
      await action(fd)
    } catch {
      // server action may redirect on success
    }
    setSaving(false)
    if (!packageId) {
      setHasSavedNewPackage(true)
      if (intent === 'add_another') {
        formRef.current?.reset()
        setName('')
        setOfferings([])
        setFileSlots([])
      }
    }
    onSaved?.()
    router.refresh()
  }

  const isDefault = defaults?.is_default || (isFirstPackage && !hasSavedNewPackage)
  const primaryLabel = submitLabel ?? 'Save package'
  const packageNameWordCount = name.trim() ? name.trim().split(/\s+/).length : 0
  const packageNameTooLong = name.length > SERVICE_PACKAGE_TITLE_MAX_CHARS
  const packageNameTooManyWords = packageNameWordCount > SERVICE_PACKAGE_TITLE_MAX_WORDS
  const hasPackageNameClientError = packageNameTooLong || packageNameTooManyWords

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      {packageId && <input type="hidden" name="packageId" value={packageId} />}
      <input type="hidden" name="isDefault" value={isDefault ? 'true' : 'false'} />
      <input type="hidden" name="displayOrder" value={defaults?.display_order ?? 0} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Package name <span className="text-destructive">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={SERVICE_PACKAGE_TITLE_MAX_CHARS}
            pattern={SERVICE_PACKAGE_TITLE_ALLOWED_PATTERN}
            placeholder="e.g. Business Website"
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {SERVICE_PACKAGE_TITLE_GUIDANCE}
          </p>
          <p className={`text-xs ${packageNameTooLong || packageNameTooManyWords ? 'text-destructive' : 'text-muted-foreground'}`}>
            {name.length}/{SERVICE_PACKAGE_TITLE_MAX_CHARS} characters · {packageNameWordCount}/{SERVICE_PACKAGE_TITLE_MAX_WORDS} words
          </p>
          {packageNameTooManyWords && (
            <p className="text-xs text-destructive">
              Keep the package name to {SERVICE_PACKAGE_TITLE_MAX_WORDS} words or fewer.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Price (credits) <span className="text-destructive">*</span>
          </label>
          <input
            name="price"
            type="number"
            required
            min="0"
            step="0.01"
            defaultValue={defaults?.price}
            placeholder="e.g. 500"
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={defaults?.description}
            placeholder="Brief summary of this tier."
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Discount type</label>
          <select
            name="discountType"
            defaultValue={defaults?.discount_type ?? 'none'}
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="none">None</option>
            <option value="percent">Percentage (%)</option>
            <option value="amount">Fixed amount (R)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Discount amount</label>
          <input
            name="discountAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.discount_amount ?? ''}
            placeholder="e.g. 10"
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-sm font-medium">Delivery time</label>
          <input
            name="deliveryTime"
            type="text"
            defaultValue={defaults?.delivery_time}
            placeholder="e.g. 3 business days, Same day, Within 1 week"
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* What's included — addable list */}
        <div className="sm:col-span-2 space-y-2">
          <div>
            <label className="block text-sm font-medium">What&apos;s included</label>
            <p className="text-xs text-muted-foreground mt-0.5">Add each included item separately.</p>
          </div>
          <ItemList
            items={offerings}
            onChange={setOfferings}
            placeholder="e.g. Full service as described"
            addLabel="Add item"
          />
        </div>

        {/* Client requirements */}
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-sm font-medium">Client requirements</label>
          <textarea
            name="requirements"
            rows={2}
            defaultValue={defaults?.requirements}
            placeholder="What the client needs to provide or confirm before booking."
            className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        {/* Required file uploads — addable list */}
        <div className="sm:col-span-2 space-y-2">
          <div>
            <label className="block text-sm font-medium">Required file uploads</label>
            <p className="text-xs text-muted-foreground mt-0.5">Named placeholders for documents the client must upload.</p>
          </div>
          <ItemList
            items={fileSlots}
            onChange={setFileSlots}
            placeholder="e.g. ID document"
            addLabel="Add upload slot"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={saving || hasPackageNameClientError}
          className="inline-flex justify-center rounded-[var(--radius)] bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : primaryLabel}
        </button>
        {!packageId && (
          <button
            type="submit"
            name="intent"
            value="add_another"
            disabled={saving || hasPackageNameClientError}
            className="inline-flex justify-center rounded-[var(--radius)] border border-primary/40 bg-background px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add package and clear form'}
          </button>
        )}
      </div>
    </form>
  )
}
