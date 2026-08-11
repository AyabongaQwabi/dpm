'use client'

import { useRef, useState } from 'react'
import { MAX_UPLOAD_FILE_SIZE_MB } from '@/lib/platform-config'
import { uploadProviderAsset } from '@/lib/actions/upload'
import { imageUploadHint } from '@/lib/image-upload-guidelines'

interface Props {
  fieldKey: string
  label: string
  isRequired: boolean
  isImage: boolean
  savedUrl?: string
}

export function ImageUploadField({ fieldKey, label, isRequired, isImage, savedUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(savedUrl ?? null)
  const [uploadedUrl, setUploadedUrl] = useState<string>(savedUrl ?? '')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')
    setProgress(10)
    setErrorMsg('')

    if (isImage) {
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
    }

    // Simulate early progress ticks while upload runs
    const ticker = setInterval(() => {
      setProgress((p) => (p < 80 ? p + 10 : p))
    }, 300)

    const fd = new FormData()
    fd.set('file', file)

    const result = await uploadProviderAsset(fd)

    clearInterval(ticker)

    if ('error' in result) {
      setStatus('error')
      setProgress(0)
      setErrorMsg(result.error)
      if (isImage) setPreview(savedUrl ?? null)
    } else {
      setProgress(100)
      setStatus('done')
      setUploadedUrl(result.url)
    }
  }

  const accept = 'image/jpeg,image/png,image/webp,image/avif,image/gif'
  const sizeNote = `JPEG, PNG, WebP, AVIF, GIF · up to ${MAX_UPLOAD_FILE_SIZE_MB} MB`
  const guidelineNote = fieldKey === 'profile_image' ? imageUploadHint('profileImage') : null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {/* Hidden form field that carries the final URL to the server action */}
      <input type="hidden" name={fieldKey} value={uploadedUrl} />

      {/* Image preview */}
      {isImage && preview && (
        <div className="relative w-full max-w-xs overflow-hidden rounded-[var(--radius)] border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          {status === 'done' && (
            <span className="absolute bottom-2 right-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Uploaded
            </span>
          )}
        </div>
      )}

      {/* Non-image uploaded file badge */}
      {!isImage && uploadedUrl && (
        <p className="text-xs text-muted-foreground bg-muted border border-border rounded-[var(--radius)] px-3 py-2 break-all">
          Uploaded: <span className="font-medium text-foreground">{uploadedUrl}</span>
        </p>
      )}

      {/* Progress bar */}
      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-primary-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={[
          'rounded-[var(--radius)] border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors select-none',
          status === 'uploading'
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-sm font-medium text-primary-accent">
          {status === 'uploading' ? 'Uploading…' : status === 'done' ? 'Replace file' : 'Choose file'}
        </span>
        <span className="text-sm text-muted-foreground"> or drag and drop</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="sr-only"
          aria-label={label}
        />
        <p className="mt-1 text-xs text-muted-foreground">{sizeNote}</p>
        {guidelineNote && <p className="mt-1 text-xs text-muted-foreground">{guidelineNote}</p>}
      </div>
    </div>
  )
}
