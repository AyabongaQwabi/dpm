'use client'

import { useRef, useState } from 'react'
import { MAX_UPLOAD_FILE_SIZE_MB } from '@/lib/platform-config'
import { useRouter } from 'next/navigation'
import { saveOnboardingStep } from '@/lib/actions/onboarding'
import { uploadProviderAsset } from '@/lib/actions/upload'

interface PortfolioItem {
  title: string
  description: string
  image_url: string
  file_url: string
  link: string
}

type UploadState = { status: 'idle' } | { status: 'uploading'; progress: number } | { status: 'done' } | { status: 'error'; message: string }

interface Props {
  stepPosition: number
  isLast: boolean
  prevStep: number | null
  nextStep: number | null
  savedPortfolio: PortfolioItem[]
}

function emptyItem(): PortfolioItem {
  return { title: '', description: '', image_url: '', file_url: '', link: '' }
}

// ── Per-item drag-and-drop uploader ─────────────────────────────────────────

function DropUploader({
  label,
  accept,
  currentUrl,
  isImage,
  onUploaded,
}: {
  label: string
  accept: string
  currentUrl: string
  isImage: boolean
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>(currentUrl ? { status: 'done' } : { status: 'idle' })
  const [preview, setPreview] = useState<string>(currentUrl)
  const [dragging, setDragging] = useState(false)

  async function processFile(file: File) {
    if (isImage) setPreview(URL.createObjectURL(file))
    setState({ status: 'uploading', progress: 10 })

    const ticker = setInterval(() => {
      setState((prev) => prev.status === 'uploading' && prev.progress < 80
        ? { status: 'uploading', progress: prev.progress + 10 }
        : prev
      )
    }, 300)

    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProviderAsset(fd)
    clearInterval(ticker)

    if ('error' in result) {
      setState({ status: 'error', message: result.error })
      if (isImage) setPreview(currentUrl)
    } else {
      setState({ status: 'done' })
      setPreview(result.url)
      onUploaded(result.url)
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) processFile(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const uploading = state.status === 'uploading'
  const progress = state.status === 'uploading' ? state.progress : 0

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      {/* Image preview */}
      {isImage && preview && (
        <div className="relative w-full overflow-hidden rounded-[var(--radius)] border border-border bg-muted/30" style={{ maxHeight: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 160 }} />
          {state.status === 'done' && (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">✓ Uploaded</span>
          )}
        </div>
      )}

      {/* Non-image uploaded filename */}
      {!isImage && preview && state.status === 'done' && (
        <p className="truncate rounded-[var(--radius)] border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
          📎 {preview.split('/').pop()}
        </p>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-1.5 rounded-full bg-primary-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">{progress}%</p>
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && (
        <p className="text-xs text-destructive">{state.message}</p>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) inputRef.current?.click() }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-1 rounded-[var(--radius)] border-2 border-dashed px-4 py-4 text-center transition-colors select-none',
          uploading
            ? 'border-primary-accent/40 bg-primary-accent/5 pointer-events-none'
            : dragging
              ? 'border-primary-accent bg-primary-accent/10 cursor-copy'
              : 'border-border bg-muted/20 hover:border-primary-accent/50 hover:bg-primary-accent/5 cursor-pointer',
        ].join(' ')}
      >
        {isImage ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 10.5h18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        )}
        <span className="text-xs font-medium text-primary-accent">
          {uploading ? 'Uploading…' : state.status === 'done' ? 'Replace' : 'Choose or drop'}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {isImage ? `JPEG, PNG, WebP, AVIF · max ${MAX_UPLOAD_FILE_SIZE_MB} MB` : `PDF, Word, ZIP · max ${MAX_UPLOAD_FILE_SIZE_MB} MB`}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
          aria-label={label}
        />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function PortfolioStep({ stepPosition, isLast, prevStep, nextStep, savedPortfolio }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<PortfolioItem[]>(
    savedPortfolio.length > 0
      ? savedPortfolio.map((item) => ({ ...emptyItem(), ...item }))
      : []
  )
  const [saving, setSaving] = useState(false)

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateField(i: number, key: keyof PortfolioItem, val: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    fd.set('__stepPosition', String(stepPosition))
    fd.set('__portfolio', JSON.stringify(items.filter((item) => item.title.trim())))
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Showcase past work. Each item can have an image, a file (PDF, brochure, etc.), and a link. Only items with a title are saved.
      </p>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="group rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <span className="text-xs font-semibold text-primary-accent uppercase tracking-wide">
                Item {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor={`pt-title-${i}`}>
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  id={`pt-title-${i}`}
                  type="text"
                  value={item.title}
                  onChange={(e) => updateField(i, 'title', e.target.value)}
                  placeholder="e.g. Corporate Gala — Sandton 2024"
                  className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor={`pt-desc-${i}`}>
                  Description
                </label>
                <textarea
                  id={`pt-desc-${i}`}
                  value={item.description}
                  onChange={(e) => updateField(i, 'description', e.target.value)}
                  rows={2}
                  placeholder="Brief description of the work done…"
                  className="w-full resize-y rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              {/* Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor={`pt-link-${i}`}>
                  Link
                  <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                </label>
                <div className="flex items-center gap-2 rounded-[var(--radius)] border border-input bg-background px-3 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  <input
                    id={`pt-link-${i}`}
                    type="url"
                    value={item.link}
                    onChange={(e) => updateField(i, 'link', e.target.value)}
                    placeholder="https://…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Image + File uploaders side by side on sm+ */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DropUploader
                  label="Image"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  currentUrl={item.image_url}
                  isImage={true}
                  onUploaded={(url) => updateField(i, 'image_url', url)}
                />
                <DropUploader
                  label="File"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.xls,.xlsx"
                  currentUrl={item.file_url}
                  isImage={false}
                  onUploaded={(url) => updateField(i, 'file_url', url)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length < 12 && (
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-accent/40 bg-primary-accent/10 px-4 py-1.5 text-sm font-semibold text-primary-accent hover:bg-primary-accent/20 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add portfolio item
        </button>
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
          disabled={saving}
          className={[
            'flex-1 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
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
