'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboardingStep } from '@/lib/actions/onboarding'

const COMMON_LANGUAGES = [
  'English', 'Zulu', 'Xhosa', 'Afrikaans', 'Sotho', 'Tswana',
  'Venda', 'Tsonga', 'Swati', 'Ndebele', 'Pedi', 'Portuguese',
  'French', 'Mandarin', 'Hindi', 'Arabic',
]

interface Props {
  stepPosition: number
  isLast: boolean
  prevStep: number | null
  nextStep: number | null
  savedLanguages: string[]
}

export function LanguagesStep({ stepPosition, isLast, prevStep, nextStep, savedLanguages }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(savedLanguages)
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(lang: string) {
    setSelected((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (!trimmed) return
    if (!selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed])
    }
    setCustom('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    fd.set('__stepPosition', String(stepPosition))
    fd.set('__languages', JSON.stringify(selected))
    try {
      await saveOnboardingStep(fd)
    } catch {
      // server action calls redirect() which throws NEXT_REDIRECT — not a real error
    }
    if (isLast) {
      router.push('/provider-dashboard')
    } else if (nextStep !== null) {
      router.push(`/provider-dashboard/onboarding?step=${nextStep}`)
    }
  }

  const isSelected = (lang: string) => selected.includes(lang)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select the languages you can communicate with clients in.
      </p>

      <div className="flex flex-wrap gap-2">
        {COMMON_LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => toggle(lang)}
            className={[
              'cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              isSelected(lang)
                ? 'bg-primary-accent text-primary-accent-foreground border-primary-accent'
                : 'border-border bg-card text-foreground hover:border-primary-accent/50 hover:bg-primary-accent/10',
            ].join(' ')}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Custom language input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Add another language…"
          className="flex-1 rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-primary-accent/40 bg-primary-accent/10 px-3 py-2 text-sm font-semibold text-primary-accent hover:bg-primary-accent/20 transition-colors cursor-pointer"
        >
          + Add
        </button>
      </div>

      {/* Selected custom languages (not in the common list) */}
      {selected.filter((l) => !COMMON_LANGUAGES.includes(l)).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.filter((l) => !COMMON_LANGUAGES.includes(l)).map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-accent text-primary-accent-foreground border border-primary-accent px-3 py-1.5 text-sm font-medium"
            >
              {lang}
              <button
                type="button"
                onClick={() => toggle(lang)}
                className="cursor-pointer opacity-70 hover:opacity-100 leading-none"
                aria-label={`Remove ${lang}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-destructive">Select at least one language.</p>
      )}

      <div className="flex gap-3 pt-2 border-t border-border">
        {prevStep !== null && (
          <a
            href={`/provider-dashboard/onboarding?step=${prevStep}`}
            className="inline-flex items-center justify-center rounded-[var(--radius)] border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
          >
            ← Back
          </a>
        )}
        <button
          type="submit"
          disabled={selected.length === 0 || saving}
          className={[
            'flex-1 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
            isLast
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-primary-accent text-primary-accent-foreground hover:opacity-90',
          ].join(' ')}
        >
          {saving ? 'Saving…' : isLast ? 'Finish & publish profile →' : 'Save & continue →'}
        </button>
      </div>
    </form>
  )
}
