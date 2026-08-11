'use client'

import { useRef, useState } from 'react'
import { MAX_UPLOAD_FILE_SIZE_MB } from '@/lib/platform-config'
import { useRouter } from 'next/navigation'
import { uploadProviderAsset } from '@/lib/actions/upload'
import { imageUploadHint } from '@/lib/image-upload-guidelines'

interface Props {
  serviceId: string
  currentImage: string | null
  action: (fd: FormData) => Promise<void>
}

export function ServiceImageUpload({ serviceId, currentImage, action }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentImage)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function processFile(file: File) {
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setProgress(10)

    const ticker = setInterval(() => {
      setProgress((p) => (p < 80 ? p + 10 : p))
    }, 300)

    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProviderAsset(fd)
    clearInterval(ticker)

    if ('error' in result) {
      setError(result.error)
      setPreview(currentImage)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    setUploading(false)

    const saveFd = new FormData()
    saveFd.set('serviceId', serviceId)
    saveFd.set('imageUrl', result.url)
    await action(saveFd)
    router.refresh()
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-3">
      {preview && (
        <div className="relative rounded-[var(--radius)] overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Cover" className="w-full object-cover max-h-56" />
          {!uploading && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 rounded-full bg-background/90 border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-background transition-colors cursor-pointer shadow-sm"
            >
              Replace
            </button>
          )}
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-1.5 rounded-full bg-primary-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!preview && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) inputRef.current?.click() }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          className={[
            'flex flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed px-4 py-10 text-center transition-colors select-none',
            uploading
              ? 'border-primary-accent/40 bg-primary-accent/5 pointer-events-none'
              : dragging
                ? 'border-primary-accent bg-primary-accent/10 cursor-copy'
                : 'border-border bg-muted/20 hover:border-primary-accent/50 hover:bg-primary-accent/5 cursor-pointer',
          ].join(' ')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 10.5h18" />
          </svg>
          <span className="text-sm font-medium text-primary-accent">Choose or drag an image</span>
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, AVIF · max {MAX_UPLOAD_FILE_SIZE_MB} MB</span>
        </div>
      )}

      {!preview && (
        <p className="text-xs text-muted-foreground">
          Use a real photo of the work, your team, or the finished result — customers and search engines
          respond better to real images than stock photos or text-heavy posters.
        </p>
      )}

      <p className="text-xs text-muted-foreground">{imageUploadHint('serviceImage')}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
        aria-label="Upload cover image"
      />
    </div>
  )
}
