'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'provider-assets'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
])

export async function uploadProviderAsset(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided.' }

  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) return { error: 'File exceeds 10 MB limit.' }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: `File type "${file.type}" is not supported.` }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${user.id}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) return { error: error.message }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl }
}
