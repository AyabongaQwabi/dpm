import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tiptapToHtml, tiptapToPlainText } from '@/lib/tiptap-to-html'
import { JsonLd } from '@/components/seo/JsonLd'
import { ReportControl } from '@/components/providers/ReportControl'
import { breadcrumbJsonLd, blogPostingJsonLd, canonicalAlternates, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

interface PostPageProps {
  params: Promise<{ slug: string; postSlug: string }>
}

// Posts are a permanent, indexable SEO asset per spec — real canonical URL,
// structured data, sitemap entry (see app/sitemap.ts). Never used for
// stories: stories have no route here (no slug column) and are rendered
// only as an ephemeral strip on the provider profile page.
export const revalidate = 3600

async function getPost(providerSlugOrId: string, postSlug: string) {
  const supabase = await createClient()
  const { data: provider } = await supabase
    .from('providers')
    .select('id, slug, business_name, is_published')
    .or(`slug.eq.${providerSlugOrId},id.eq.${providerSlugOrId}`)
    .eq('is_published', true)
    .maybeSingle()

  if (!provider) return null

  const { data: post } = await supabase
    .from('content_posts')
    .select('id, title, slug, body, body_json, image_url, media, published_at, updated_at, created_at')
    .eq('provider_id', provider.id)
    .eq('kind', 'post')
    .eq('slug', postSlug)
    .eq('status', 'published')
    .eq('moderation_status', 'passed')
    .maybeSingle()

  if (!post) return null

  return { provider, post }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug, postSlug } = await params
  const result = await getPost(slug, postSlug)
  if (!result) return {}

  const { provider, post } = result
  const profilePath = provider.slug ?? provider.id
  const path = `/providers/${profilePath}/posts/${post.slug}`
  const description = tiptapToPlainText(post.body_json).slice(0, 160) || post.body?.slice(0, 160) || ''
  const title = `${post.title} — ${provider.business_name}`

  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    openGraph: defaultOpenGraph(title, description, path, post.image_url ? { url: post.image_url, width: 1200, height: 630, alt: post.title ?? '' } : undefined),
    twitter: defaultTwitter(title, description, post.image_url ? { url: post.image_url } : undefined),
  }
}

export default async function ProviderPostPage({ params }: PostPageProps) {
  const { slug, postSlug } = await params
  const result = await getPost(slug, postSlug)
  if (!result) notFound()

  const { provider, post } = result
  const profilePath = provider.slug ?? provider.id
  const path = `/providers/${profilePath}/posts/${post.slug}`
  const html = tiptapToHtml(post.body_json)
  const plainText = tiptapToPlainText(post.body_json) || post.body || ''

  // Fire-and-forget view count — best-effort, doesn't block render.
  const admin = createAdminClient()
  void admin.rpc('increment_post_view_count', { p_post_id: post.id }).then(undefined, () => {})

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: provider.business_name, path: `/providers/${profilePath}` },
            { name: post.title ?? 'Post', path },
          ]),
          blogPostingJsonLd({
            title: post.title ?? '',
            bodyText: plainText,
            path,
            image: post.image_url,
            publishedAt: post.published_at ?? post.created_at,
            updatedAt: post.updated_at ?? post.created_at,
            provider: { name: provider.business_name, path: `/providers/${profilePath}` },
          }),
        ]}
      />
      <Link href={`/providers/${profilePath}`} className="text-sm text-primary-accent hover:underline">
        ← {provider.business_name}
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{post.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {new Date(post.published_at ?? post.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt={post.title ?? ''} className="mt-6 w-full rounded-xl object-cover" />
      )}
      <div className="prose prose-sm mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-8 border-t pt-4">
        <ReportControl postId={post.id} />
      </div>
    </main>
  )
}
