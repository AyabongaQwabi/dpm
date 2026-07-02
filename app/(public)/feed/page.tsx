// Social content feed page (PRD Section 13, FEED-001 through FEED-004).
// Reverse-chronological. Scoped to tenant category; all categories on home marketplace.
// No moderation logic in v1 — PRD Section 17 explicitly defers this.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { Avatar } from '@/components/ui/Avatar'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantContext()
  const siteName = tenant.branding?.siteName ?? 'ServicePros'
  const title = `${siteName} provider content feed`
  const description =
    'Browse tips, updates, and promos from verified South African service providers. Discover local expertise before you book.'
  return {
    title,
    description,
    alternates: canonicalAlternates('/feed'),
    openGraph: defaultOpenGraph(title, description, '/feed'),
    twitter: defaultTwitter(title, description),
  }
}

export default async function FeedPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  let query = supabase
    .from('content_posts')
    .select(`
      id,
      image_url,
      body,
      post_type,
      created_at,
      provider:providers!inner(
        id,
        slug,
        business_name,
        profile_image,
        is_published,
        provider_types!inner(name, category_id)
      )
    `)
    .eq('provider.is_published', true)
    .order('created_at', { ascending: false })
    .limit(48)

  if (tenant.categoryId) {
    query = query.eq('provider.provider_types.category_id', tenant.categoryId)
  }

  const { data: posts } = await query

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <section className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">Content</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          {tenant.branding?.siteName ? `${tenant.branding.siteName} feed` : 'Provider content feed'}
        </h1>
        <p className="mt-4 text-muted-foreground">
          Social posts, updates, tips, and promos from providers across the marketplace.
        </p>
      </section>

      {!posts || posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const provider = Array.isArray(post.provider) ? post.provider[0] : post.provider
            const providerType = provider
              ? Array.isArray(provider.provider_types)
                ? provider.provider_types[0]
                : provider.provider_types
              : null

            return (
              <article key={post.id} className="overflow-hidden rounded-xl border bg-card">
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image_url} alt="" className="w-full max-h-80 object-cover" />
                )}
                <div className="p-4">
                  {provider && (
                    <Link
                      href={`/providers/${provider.slug ?? provider.id}`}
                      className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity"
                    >
                      <Avatar
                        src={provider.profile_image}
                        alt={provider.business_name}
                        size="sm"
                        shape="circle"
                      />
                      <div>
                        <p className="text-sm font-semibold leading-none">
                          {provider.business_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{providerType?.name}</p>
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  )}
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary-accent">
                    {post.post_type ?? 'social'}
                  </p>
                  {post.body && (
                    <p className="text-sm leading-6 text-muted-foreground whitespace-pre-line">{post.body}</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
