'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useRef, useState } from 'react'
import { uploadProviderAsset } from '@/lib/actions/upload'

interface ArticleEditorProps {
  serviceId: string
  initialJson: unknown | null
  onSave: (articleJson: string, articleText: string) => Promise<void>
}

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

export function ArticleEditor({ serviceId, initialJson, onSave }: ArticleEditorProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Youtube.configure({ controls: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write a compelling article about this service. Explain what you do, who it\'s for, and what makes you the right provider…' }),
    ],
    content: initialJson ? (initialJson as object) : undefined,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[320px] focus:outline-none px-4 py-3',
      },
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    const json = editor.getJSON()
    const text = getPlainText(json)
    await onSave(JSON.stringify(json), text)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, onSave])

  const insertYoutube = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Paste a YouTube URL')
    if (!url) return
    editor.commands.setYoutubeVideo({ src: url })
  }, [editor])

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return
    setImageUploading(true)
    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProviderAsset(fd)
    setImageUploading(false)
    if ('error' in result) {
      alert(result.error)
      return
    }
    editor.chain().focus().setImage({ src: result.url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="border rounded-xl overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b bg-muted/40 px-2 py-1.5 flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          •—
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          1—
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={insertYoutube} title="Embed YouTube">
          ▶
        </ToolbarButton>
        <ToolbarButton
          onClick={() => imageInputRef.current?.click()}
          title={imageUploading ? 'Uploading…' : 'Insert image'}
        >
          {imageUploading ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageFile(file)
            e.target.value = ''
          }}
        />
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save article'}
          </button>
        </div>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'px-2 py-1 rounded text-sm font-mono transition-colors cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
