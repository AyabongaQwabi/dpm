'use client'

import { useState } from 'react'

interface LinkItem {
  label: string
  url: string
}

interface Props {
  fieldKey: string
  label: string
  isRequired: boolean
  saved: LinkItem[]
}

export function ExternalLinksField({ fieldKey, label, isRequired, saved }: Props) {
  const [items, setItems] = useState<LinkItem[]>(saved.length > 0 ? saved : [])

  function add() {
    setItems((prev) => [...prev, { label: '', url: '' }])
  }

  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function update(i: number, key: keyof LinkItem, val: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  const valid = items.filter((l) => l.url.trim())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
          {isRequired && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-full border border-primary-accent/40 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent hover:bg-primary-accent/20 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add link
        </button>
      </div>

      <input type="hidden" name={`__${fieldKey}`} value={JSON.stringify(valid)} />

      {items.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No links yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add your website, booking page, or any useful resource.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-2">
            <div className="flex flex-1 items-start gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-3 shadow-sm">
              <div className="mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <input
                  type="text"
                  placeholder="Label (e.g. Book a consultation)"
                  value={item.label}
                  onChange={(e) => update(i, 'label', e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <input
                  type="url"
                  placeholder="https://…"
                  value={item.url}
                  onChange={(e) => update(i, 'url', e.target.value)}
                  className="w-full bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:text-foreground"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove link"
              className="mt-3 text-muted-foreground hover:text-destructive transition-colors cursor-pointer opacity-0 group-hover:opacity-100 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {valid.length} of {items.length} link{items.length !== 1 ? 's' : ''} with a URL
        </p>
      )}
    </div>
  )
}
