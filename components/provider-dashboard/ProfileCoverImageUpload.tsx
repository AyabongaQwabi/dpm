'use client'

import { useEffect, useRef, useState } from 'react'
import { uploadProviderAsset } from '@/lib/actions/upload'
import { MAX_UPLOAD_FILE_SIZE_MB } from '@/lib/platform-config'
import { imageUploadHint } from '@/lib/image-upload-guidelines'

export function ProfileCoverImageUpload({ currentImage }: { currentImage: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentImage)
  const [savedUrl, setSavedUrl] = useState(currentImage ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const form = hiddenInputRef.current?.form
    if (!form) return

    function preventSubmitWhileUploading(event: SubmitEvent) {
      if (!uploading) return
      event.preventDefault()
      event.stopImmediatePropagation()
      setError('Wait for the cover image upload to finish before saving.')
    }

    form.addEventListener('submit', preventSubmitWhileUploading)
    return () => form.removeEventListener('submit', preventSubmitWhileUploading)
  }, [uploading])

  async function handleFile(file: File) {
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProviderAsset(fd)

    setUploading(false)
    if ('error' in result) {
      setError(result.error)
      setPreview(savedUrl || null)
      return
    }
    setSavedUrl(result.url)
    setPreview(result.url)
  }

  return (
    <div className="space-y-3">
      <input ref={hiddenInputRef} type="hidden" name="coverImage" value={savedUrl} />

      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Profile cover preview" className="h-40 w-full object-cover sm:h-52" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/45 px-3 py-2 text-white">
            <span className="text-xs">{uploading ? 'Uploading...' : 'Cover image'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-md bg-white/90 px-3 py-1 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null)
                  setSavedUrl('')
                }}
                disabled={uploading}
                className="rounded-md border border-white/60 px-3 py-1 text-xs font-semibold disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary-accent/50 hover:bg-primary-accent/5 disabled:opacity-60"
        >
          <span className="text-sm font-semibold text-primary-accent">
            {uploading ? 'Uploading...' : 'Upload cover image'}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            JPEG/PNG/WebP/AVIF, max {MAX_UPLOAD_FILE_SIZE_MB} MB
          </span>
        </button>
      )}

      {uploading && (
        <p className="rounded-md border border-primary-accent/30 bg-primary-accent/5 px-3 py-2 text-xs font-medium text-primary-accent">
          Uploading cover image. Save once this finishes.
        </p>
      )}

      <p className="text-xs text-muted-foreground">{imageUploadHint('profileCover')}</p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
