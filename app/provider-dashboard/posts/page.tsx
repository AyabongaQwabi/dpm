import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { hasEntitlement } from '@/lib/actions/pro-membership'
import { ENTITLEMENT_KEYS } from '@/lib/entitlements'
import { getPublishingLimits } from '@/lib/provider-posts-config'
import { publishPost, publishStory, saveDraft, publishDraft, unpublishPost, deletePost } from '@/lib/actions/provider-posts'
import { PostComposer } from '@/components/provider-dashboard/PostComposer'
import { PostsList } from '@/components/provider-dashboard/PostsList'

interface PostsPageProps {
  searchParams: Promise<{ error?: string; published?: string }>
}

async function countPostsThisMonth(providerId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('kind', 'post')
    .neq('status', 'draft')
    .gte('published_at', monthStart.toISOString())

  return count ?? 0
}

async function countLiveStories(providerId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  const { count } = await supabase
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('kind', 'story')
    .eq('status', 'published')
    .gt('expires_at', new Date().toISOString())

  return count ?? 0
}

export default async function PostsComposerPage({ searchParams }: PostsPageProps) {
  const { provider } = await requireProviderSession()
  const { error, published } = await searchParams
  const supabase = await createClient()

  const isPro = await hasEntitlement(provider.id, ENTITLEMENT_KEYS.PUBLISHING_LIMITS)
  const limits = getPublishingLimits(isPro)

  const [postsThisMonth, storiesLive, { data: existingPosts }] = await Promise.all([
    countPostsThisMonth(provider.id, supabase),
    countLiveStories(provider.id, supabase),
    supabase
      .from('content_posts')
      .select('id, kind, title, slug, body, status, moderation_status, published_at, expires_at, created_at, image_url')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="max-w-3xl px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Posts & Stories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Posts are permanent and appear on your profile and in search. Stories disappear after 24 hours.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {decodeURIComponent(error)}
        </p>
      )}
      {published && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          Published.
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Your limits {isPro && <span className="text-primary-accent">(Pro)</span>}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Posts this month</dt>
            <dd className="font-semibold">{postsThisMonth} / {limits.postsPerMonth}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stories live</dt>
            <dd className="font-semibold">{storiesLive} / {limits.storiesLiveAtOnce}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Images per post</dt>
            <dd className="font-semibold">{limits.imagesPerPost}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Body length</dt>
            <dd className="font-semibold">{limits.bodyMaxChars} chars</dd>
          </div>
        </dl>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            Pro raises these limits. Publishing itself is free for every provider.
          </p>
        )}
      </section>

      <PostComposer
        limits={limits}
        postsRemaining={Math.max(0, limits.postsPerMonth - postsThisMonth)}
        storiesRemaining={Math.max(0, limits.storiesLiveAtOnce - storiesLive)}
        publishPostAction={publishPost}
        publishStoryAction={publishStory}
        saveDraftAction={saveDraft}
        publishDraftAction={publishDraft}
      />

      <PostsList
        posts={existingPosts ?? []}
        unpublishAction={unpublishPost}
        deleteAction={deletePost}
      />
    </div>
  )
}
