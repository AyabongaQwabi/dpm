'use client'

import { useRef, useState } from 'react'
import { uploadProviderAsset } from '@/lib/actions/upload'

interface GalleryImage {
  url: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  preview: string
  name: string
}

interface Props {
  fieldKey: string
  label: string
  isRequired: boolean
  savedUrls: string[]
}

export function GalleryUploadField({ fieldKey, label, isRequired, savedUrls }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<GalleryImage[]>(
    savedUrls.map((url) => ({ url, status: 'done', progress: 100, preview: url, name: url.split('/').pop() ?? '' }))
  )

  function updateImage(index: number, patch: Partial<GalleryImage>) {
    setImages((prev) => prev.map((img, i) => i === index ? { ...img, ...patch } : img))
  }

  async function uploadOne(file: File, index: number) {
    const ticker = setInterval(() => {
      setImages((prev) =>
        prev.map((img, i) =>
          i === index && img.status === 'uploading' && img.progress < 80
            ? { ...img, progress: img.progress + 10 }
            : img
        )
      )
    }, 300)

    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProviderAsset(fd)

    clearInterval(ticker)

    if ('error' in result) {
      updateImage(index, { status: 'error', progress: 0, error: result.error })
    } else {
      updateImage(index, { status: 'done', progress: 100, url: result.url })
    }
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    // Reset input so the same files can be re-selected after an error
    e.target.value = ''

    const startIndex = images.length
    const newImages: GalleryImage[] = files.map((file) => ({
      url: '',
      status: 'uploading',
      progress: 10,
      preview: URL.createObjectURL(file),
      name: file.name,
    }))

    setImages((prev) => [...prev, ...newImages])

    await Promise.all(files.map((file, i) => uploadOne(file, startIndex + i)))
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const img = prev[index]
      if (img.preview && img.preview.startsWith('blob:')) {
        URL.revokeObjectURL(img.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const doneUrls = images.filter((img) => img.status === 'done').map((img) => img.url)
  const uploading = images.some((img) => img.status === 'uploading')

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {/* Hidden field carries the JSON array of uploaded URLs to the server action */}
      <input type="hidden" name={fieldKey} value={JSON.stringify(doneUrls)} />

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt={img.name}
                className={[
                  'h-full w-full object-cover transition-opacity',
                  img.status === 'uploading' ? 'opacity-50' : 'opacity-100',
                ].join(' ')}
              />

              {/* Upload progress overlay */}
              {img.status === 'uploading' && (
                <div className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-1 rounded-full bg-primary-accent transition-all duration-300"
                      style={{ width: `${img.progress}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-center text-[10px] text-muted-foreground">{img.progress}%</p>
                </div>
              )}

              {/* Done badge */}
              {img.status === 'done' && (
                <span className="absolute bottom-1 left-1 rounded-full bg-primary/90 px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  ✓
                </span>
              )}

              {/* Error overlay */}
              {img.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/20 px-1 text-center">
                  <p className="text-[10px] font-semibold text-destructive leading-tight">{img.error}</p>
                </div>
              )}

              {/* Remove button */}
              {img.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-destructive hover:text-destructive-foreground transition-colors text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={[
          'rounded-[var(--radius)] border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors select-none',
          uploading
            ? 'border-primary-accent/50 bg-primary-accent/5 pointer-events-none'
            : 'border-border bg-muted/30 hover:border-primary-accent/50 hover:bg-primary-accent/5',
        ].join(' ')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 10.5h18" />
        </svg>
        <span className="text-sm font-medium text-primary-accent">
          {uploading ? 'Uploading…' : images.length > 0 ? 'Add more images' : 'Choose images'}
        </span>
        <span className="text-sm text-muted-foreground"> or drag and drop</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          onChange={handleChange}
          className="sr-only"
          aria-label={label}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP, AVIF, GIF · up to 10 MB each · select multiple at once
        </p>
      </div>

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {doneUrls.length} of {images.length} image{images.length !== 1 ? 's' : ''} uploaded
        </p>
      )}
    </div>
  )
}
