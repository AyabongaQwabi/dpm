'use client'

import { useEffect, useState } from 'react'

interface PostRow {
  id: string
  kind: 'post' | 'story' | null
  title: string | null
  slug: string | null
  body: string | null
  status: string | null
  moderation_status: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string
  image_url: string | null
}

function useCountdown(expiresAt: string | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null)

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Expired')
        return
      }
      const hours = Math.floor(diff / 3_600_000)
      const minutes = Math.floor((diff % 3_600_000) / 60_000)
      setRemaining(`${hours}h ${minutes}m left`)
    }
    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return remaining
}

function PostRow({
  post,
  unpublishAction,
  deleteAction,
}: {
  post: PostRow
  unpublishAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}) {
  const countdown = useCountdown(post.kind === 'story' ? post.expires_at : null)
  const kindLabel = post.kind === 'story' ? 'Story' : 'Post'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-accent">{kindLabel}</span>
          {post.status === 'draft' && <span className="text-xs text-muted-foreground">(Draft)</span>}
          {post.status === 'removed' && <span className="text-xs text-muted-foreground">(Removed)</span>}
          {post.status === 'expired' && <span className="text-xs text-muted-foreground">(Expired)</span>}
          {post.moderation_status === 'flagged' && (
            <span className="text-xs text-amber-600">Flagged for review</span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-foreground">{post.title ?? (post.body?.slice(0, 60) || 'Untitled')}</p>
        {countdown && <p className="text-xs text-muted-foreground">{countdown}</p>}
      </div>
      {post.status === 'published' && (
        <form action={unpublishAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            Unpublish
          </button>
        </form>
      )}
      <form action={deleteAction} onSubmit={(e) => { if (!window.confirm('Delete this permanently?')) e.preventDefault() }}>
        <input type="hidden" name="postId" value={post.id} />
        <button type="submit" className="text-xs text-destructive underline-offset-2 hover:underline">
          Delete
        </button>
      </form>
    </div>
  )
}

export function PostsList({
  posts,
  unpublishAction,
  deleteAction,
}: {
  posts: PostRow[]
  unpublishAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing published yet.</p>
  }

  return (
    <section>
      <h2 className="mb-3 font-semibold text-foreground">Your posts & stories</h2>
      <div className="space-y-2">
        {posts.map((post) => (
          <PostRow key={post.id} post={post} unpublishAction={unpublishAction} deleteAction={deleteAction} />
        ))}
      </div>
    </section>
  )
}
