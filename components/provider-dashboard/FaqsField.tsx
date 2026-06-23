'use client'

import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  fieldKey: string
  label: string
  isRequired: boolean
  saved: FaqItem[]
}

export function FaqsField({ fieldKey, label, isRequired, saved }: Props) {
  const [items, setItems] = useState<FaqItem[]>(saved.length > 0 ? saved : [])

  function add() {
    setItems((prev) => [...prev, { question: '', answer: '' }])
  }

  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function update(i: number, key: keyof FaqItem, val: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  const valid = items.filter((f) => f.question.trim() && f.answer.trim())

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
          Add question
        </button>
      </div>

      <input type="hidden" name={`__${fieldKey}`} value={JSON.stringify(valid)} />

      {items.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No questions yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Click "Add question" to let customers know what to expect.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="group rounded-[var(--radius)] border border-border bg-card px-4 py-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary-accent uppercase tracking-wide">Q{i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="What's the question customers ask?"
                value={item.question}
                onChange={(e) => update(i, 'question', e.target.value)}
                className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
            <div className="space-y-1">
              <textarea
                placeholder="Your answer…"
                value={item.answer}
                onChange={(e) => update(i, 'answer', e.target.value)}
                rows={3}
                className="w-full resize-y rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {valid.length} of {items.length} question{items.length !== 1 ? 's' : ''} complete
        </p>
      )}
    </div>
  )
}
