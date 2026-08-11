'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { uploadProviderAsset } from '@/lib/actions/upload'
import { tiptapToHtml } from '@/lib/tiptap-to-html'
import type { PublishingLimits } from '@/lib/provider-posts-config'

// Reuses the same Tiptap extension set as StoryComposer/ArticleEditor
// (StarterKit + Image + Placeholder) — no second editor config, per Step 0.

function getPlainText(json: unknown): string {
  if (!json || typeof json !== 'object') return ''
  const node = json as { content?: unknown[] }
  if (!node.content) return ''
  return node.content
    .map((child: unknown) => {
      const c = child as { type?: string; text?: string; content?: unknown[] }
      if (c.type === 'text') return c.text ?? ''
      if (c.content) return getPlainText(c)
      return ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface PostComposerProps {
  limits: PublishingLimits
  postsRemaining: number
  storiesRemaining: number
  publishPostAction: (formData: FormData) => Promise<void>
  publishStoryAction: (formData: FormData) => Promise<void>
  saveDraftAction: (formData: FormData) => Promise<{ ok: boolean; draftId?: string }>
  publishDraftAction: (formData: FormData) => Promise<void>
}

const AUTOSAVE_DEBOUNCE_MS = 2000

export function PostComposer({
  limits,
  postsRemaining,
  storiesRemaining,
  publishPostAction,
  publishStoryAction,
  saveDraftAction,
}: PostComposerProps) {
  const [kind, setKind] = useState<'post' | 'story'>('post')
  const [title, setTitle] = useState('')
  const [media, setMedia] = useState<string[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: kind === 'story' ? 'Share an update with customers…' : 'Write about the job — what you did, for whom, and how it went…' }),
    ],
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none min-h-[160px] focus:outline-none px-4 py-3' },
    },
  })

  const bodyText = editor ? getPlainText(editor.getJSON()) : ''
  const bodyJson = editor ? editor.getJSON() : null
  const previewHtml = bodyJson ? tiptapToHtml(bodyJson) : ''
  const overBodyLimit = bodyText.length > limits.bodyMaxChars
  const overImageLimit = media.length > limits.imagesPerPost

  // Draft autosave — posts only, debounced. Stories publish immediately or
  // not at all (no story drafts), so autosave is skipped entirely when kind === 'story'.
  useEffect(() => {
    if (kind !== 'post') return
    if (!bodyText && !title && media.length === 0) return

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus('saving')
      const fd = new FormData()
      if (draftId) fd.set('draftId', draftId)
      fd.set('title', title)
      fd.set('bodyJson', JSON.stringify(bodyJson))
      fd.set('media', JSON.stringify(media))
      const result = await saveDraftAction(fd)
      if (result.ok && result.draftId) setDraftId(result.draftId)
      setAutosaveStatus('saved')
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, title, bodyText, media])

  const handleImageFile = useCallback(async (file: File) => {
    setImageUploading(true)
    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProviderAsset(fd)
    setImageUploading(false)
    if ('error' in result) {
      window.alert(result.error)
      return
    }
    setMedia((prev) => [...prev, result.url])
  }, [])

  const handlePublish = useCallback(async () => {
    if (!editor) return
    setPublishing(true)
    const fd = new FormData()
    fd.set('bodyJson', JSON.stringify(editor.getJSON()))
    fd.set('media', JSON.stringify(media))
    if (kind === 'post') {
      fd.set('title', title)
      await publishPostAction(fd)
    } else {
      await publishStoryAction(fd)
    }
    setPublishing(false)
  }, [editor, kind, title, media, publishPostAction, publishStoryAction])

  const remaining = kind === 'post' ? postsRemaining : storiesRemaining
  const atLimit = remaining <= 0

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setKind('post')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${kind === 'post' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Post
        </button>
        <button
          type="button"
          onClick={() => setKind('story')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${kind === 'story' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Story
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {remaining} {kind === 'post' ? 'post' : 'story slot'}{remaining === 1 ? '' : 's'} remaining
          {kind === 'post' ? ' this month' : ''}
        </span>
      </div>

      {kind === 'story' && (
        <p className="mt-3 text-xs text-muted-foreground">
          Stories disappear after 24 hours and are never shown in search. No drafts — publish now or not at all.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {kind === 'post' && (
          <div>
            <label htmlFor="post-title" className="text-sm font-medium text-foreground">Title</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              placeholder="What's this post about?"
            />
          </div>
        )}

        <div>
          <div className="rounded-xl border border-input bg-background overflow-hidden">
            <EditorContent editor={editor} />
          </div>
          <p className={`mt-1 text-xs ${overBodyLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
            {bodyText.length} / {limits.bodyMaxChars} characters
          </p>
        </div>

        {media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-border" />
                <button
                  type="button"
                  onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <p className={`text-xs ${overImageLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {media.length} / {limits.imagesPerPost} images
        </p>

        <div className="flex items-center gap-3">
          <label className="text-sm text-primary-accent cursor-pointer hover:underline">
            {imageUploading ? 'Uploading…' : 'Add image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="sr-only"
              disabled={imageUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageFile(file)
                e.target.value = ''
              }}
            />
          </label>
          {kind === 'post' && (
            <span className="text-xs text-muted-foreground">
              {autosaveStatus === 'saving' ? 'Saving draft…' : autosaveStatus === 'saved' ? 'Draft saved' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || imageUploading || atLimit || overBodyLimit || overImageLimit || (kind === 'post' && !title.trim())}
            className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : atLimit ? 'Limit reached' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Live preview */}
      {(title || bodyText) && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <div className="mt-2 rounded-xl border border-border bg-background p-4">
            {kind === 'post' && title && <h3 className="font-semibold text-foreground">{title}</h3>}
            {media[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media[0]} alt="" className="mt-2 max-h-48 rounded-lg object-cover" />
            )}
            <div className="prose prose-sm mt-2 max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </section>
  )
}
