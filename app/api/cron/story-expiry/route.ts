import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EXPIRED_STORY_MEDIA_RETENTION_DAYS } from '@/lib/provider-posts-config'

// Flips published stories past their 24h expires_at to status='expired'.
// Idempotent: only ever selects status='published' rows, so re-running
// against an already-expired story is a no-op (it won't match the filter
// twice). Media is NOT deleted here — expired posts (and their media
// references) are kept for EXPIRED_STORY_MEDIA_RETENTION_DAYS in case of
// dispute, per spec. This route only flips status; nothing here calls
// storage.remove().
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: expiring } = await admin
    .from('content_posts')
    .select('id')
    .eq('kind', 'story')
    .eq('status', 'published')
    .not('expires_at', 'is', null)
    .lt('expires_at', now)
    .limit(500)

  let expired = 0
  for (const story of expiring ?? []) {
    const { error } = await admin
      .from('content_posts')
      .update({ status: 'expired' })
      .eq('id', story.id)
      .eq('status', 'published') // re-check status at write time — idempotent under concurrent runs

    if (!error) expired += 1
  }

  return NextResponse.json({
    expired,
    mediaRetentionDays: EXPIRED_STORY_MEDIA_RETENTION_DAYS,
    note: 'Media purge is not implemented in this pass — expired posts are kept, not deleted.',
  })
}
