'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import type { DiscountType, ServiceType } from '@/lib/db'

// ---- Service CRUD ----

export async function createService(formData: FormData) {
  const { provider } = await requireProviderSession()
  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string).trim()
  const serviceType = (formData.get('serviceType') as ServiceType) ?? 'fixed_deliverable'

  if (!title || !description) return

  const admin = createAdminClient()
  const { data: service } = await admin
    .from('services')
    .insert({
      provider_id: provider.id,
      title,
      description,
      price: 0,
      discount_type: 'none' as DiscountType,
      service_type: serviceType,
      is_published: false,
    })
    .select('id')
    .single()

  if (!service) return

  revalidatePath('/provider-dashboard/services')
  redirect(`/provider-dashboard/services/${service.id}`)
}

export async function updateServiceMeta(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string
  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string).trim()
  const serviceType = (formData.get('serviceType') as ServiceType) ?? 'fixed_deliverable'

  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!existing) redirect('/provider-dashboard/services')

  if (!title || !description) {
    revalidatePath(`/provider-dashboard/services/${serviceId}`)
    return
  }

  const admin = createAdminClient()
  await admin
    .from('services')
    .update({ title, description, service_type: serviceType })
    .eq('id', serviceId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath('/provider-dashboard/services')
  revalidatePath(`/providers/${provider.id}`)
}

export async function updateServiceImage(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string
  const imageUrl = (formData.get('imageUrl') as string ?? '').trim()

  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!existing) return

  const admin = createAdminClient()
  await admin
    .from('services')
    .update({ image: imageUrl || null })
    .eq('id', serviceId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath(`/services/${serviceId}`)
}

export async function saveServiceArticle(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string
  const articleJsonRaw = formData.get('articleJson') as string
  const articleText = (formData.get('articleText') as string).trim()

  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!existing) redirect('/provider-dashboard/services')

  let articleJson: unknown
  try {
    articleJson = JSON.parse(articleJsonRaw)
  } catch {
    revalidatePath(`/provider-dashboard/services/${serviceId}`)
    return
  }

  const admin = createAdminClient()
  await admin
    .from('services')
    .update({ article_json: articleJson, article_text: articleText })
    .eq('id', serviceId)

  await maybePublishService(admin, supabase, serviceId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath(`/providers/${provider.id}`)
}

export async function publishService(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string

  const { data: existing } = await supabase
    .from('services')
    .select('id, article_json')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!existing) redirect('/provider-dashboard/services')

  const { count: pkgCount } = await supabase
    .from('service_packages')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  const hasArticle = !!existing.article_json
  const hasPackages = (pkgCount ?? 0) > 0

  if (!hasArticle || !hasPackages) {
    revalidatePath(`/provider-dashboard/services/${serviceId}`)
    return
  }

  const admin = createAdminClient()
  await admin.from('services').update({ is_published: true }).eq('id', serviceId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath('/provider-dashboard/services')
  revalidatePath(`/providers/${provider.id}`)
}

export async function unpublishService(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string

  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!existing) redirect('/provider-dashboard/services')

  const admin = createAdminClient()
  await admin.from('services').update({ is_published: false }).eq('id', serviceId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath('/provider-dashboard/services')
  revalidatePath(`/providers/${provider.id}`)
}

export async function deleteService(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string

  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!existing) redirect('/provider-dashboard/services')

  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  if (count && count > 0) {
    revalidatePath('/provider-dashboard/services')
    return
  }

  const admin = createAdminClient()
  await admin.from('services').delete().eq('id', serviceId)

  revalidatePath('/provider-dashboard/services')
  revalidatePath(`/providers/${provider.id}`)
  redirect('/provider-dashboard/services')
}

// ---- Package CRUD ----

export async function upsertPackage(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const serviceId = formData.get('serviceId') as string
  const packageId = (formData.get('packageId') as string) || null

  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!service) redirect('/provider-dashboard/services')

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const price = parseFloat(formData.get('price') as string)
  const discountType = (formData.get('discountType') as DiscountType) ?? 'none'
  const rawDiscount = formData.get('discountAmount') as string
  const discountAmount = discountType !== 'none' && rawDiscount ? parseFloat(rawDiscount) : null
  // Accept either JSON arrays (from client component) or legacy newline-delimited textarea
  const offeringsJson = formData.get('offeringsJson') as string | null
  const offerings: string[] = offeringsJson
    ? (JSON.parse(offeringsJson) as string[])
    : ((formData.get('offeringsRaw') as string) ?? '').split('\n').map((o) => o.trim()).filter(Boolean)

  const requirements = (formData.get('requirements') as string ?? '').trim()

  const fileSlotsJson = formData.get('fileSlotsJson') as string | null
  const requirementFileSlots: { name: string }[] = fileSlotsJson
    ? (JSON.parse(fileSlotsJson) as string[]).map((s) => ({ name: s }))
    : ((formData.get('fileSlotsRaw') as string) ?? '').split('\n').map((s) => ({ name: s.trim() })).filter((s) => s.name)
  const deliveryTime = (formData.get('deliveryTime') as string).trim()
  const isDefault = formData.get('isDefault') === 'true'
  const displayOrder = parseInt(formData.get('displayOrder') as string) || 0

  if (!name || isNaN(price) || price < 0) {
    revalidatePath(`/provider-dashboard/services/${serviceId}`)
    return
  }

  const admin = createAdminClient()

  if (isDefault) {
    // Clear existing default for this service before setting new one
    await admin
      .from('service_packages')
      .update({ is_default: false })
      .eq('service_id', serviceId)
      .neq('id', packageId ?? '')
  }

  if (packageId) {
    const { data: existingPkg } = await supabase
      .from('service_packages')
      .select('id')
      .eq('id', packageId)
      .eq('service_id', serviceId)
      .single()

    if (!existingPkg) {
      revalidatePath(`/provider-dashboard/services/${serviceId}`)
      return
    }

    await admin
      .from('service_packages')
      .update({ name, description, price, discount_type: discountType, discount_amount: discountAmount, offerings, requirements, requirement_file_slots: requirementFileSlots, delivery_time: deliveryTime, is_default: isDefault, display_order: displayOrder })
      .eq('id', packageId)
  } else {
    // When creating the first package for a service, make it default automatically
    const { count: existingCount } = await supabase
      .from('service_packages')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', serviceId)

    const shouldBeDefault = isDefault || (existingCount ?? 0) === 0

    await admin
      .from('service_packages')
      .insert({ service_id: serviceId, name, description, price, discount_type: discountType, discount_amount: discountAmount, offerings, requirements, requirement_file_slots: requirementFileSlots, delivery_time: deliveryTime, is_default: shouldBeDefault, display_order: displayOrder })
  }

  await maybePublishService(admin, supabase, serviceId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath(`/providers/${provider.id}`)
}

export async function deletePackage(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const packageId = formData.get('packageId') as string
  const serviceId = formData.get('serviceId') as string

  const { data: pkg } = await supabase
    .from('service_packages')
    .select('id, is_default, service_id')
    .eq('id', packageId)
    .single()

  if (!pkg) redirect('/provider-dashboard/services')

  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('id', pkg.service_id)
    .eq('provider_id', provider.id)
    .single()

  if (!service) redirect('/provider-dashboard/services')

  const admin = createAdminClient()
  await admin.from('service_packages').delete().eq('id', packageId)

  // If deleted package was default, promote the lowest display_order remaining package
  if (pkg.is_default) {
    const { data: remaining } = await supabase
      .from('service_packages')
      .select('id')
      .eq('service_id', pkg.service_id)
      .order('display_order', { ascending: true })
      .limit(1)

    if (remaining && remaining.length > 0) {
      await admin
        .from('service_packages')
        .update({ is_default: true })
        .eq('id', remaining[0].id)
    }
  }

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath(`/providers/${provider.id}`)
}

export async function setDefaultPackage(formData: FormData) {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()
  const packageId = formData.get('packageId') as string
  const serviceId = formData.get('serviceId') as string

  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('provider_id', provider.id)
    .single()

  if (!service) redirect('/provider-dashboard/services')

  const admin = createAdminClient()
  await admin
    .from('service_packages')
    .update({ is_default: false })
    .eq('service_id', serviceId)

  await admin
    .from('service_packages')
    .update({ is_default: true })
    .eq('id', packageId)

  revalidatePath(`/provider-dashboard/services/${serviceId}`)
  revalidatePath(`/providers/${provider.id}`)
}

// ---- Internal helper ----

// Auto-publish if service has both an article and at least one package.
// Auto-unpublish if either is removed.
async function maybePublishService(
  admin: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceId: string,
) {
  const { data: svc } = await supabase
    .from('services')
    .select('article_json, is_published')
    .eq('id', serviceId)
    .single()

  const { count: pkgCount } = await supabase
    .from('service_packages')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  const shouldPublish = !!svc?.article_json && (pkgCount ?? 0) > 0

  if (shouldPublish !== svc?.is_published) {
    await admin.from('services').update({ is_published: shouldPublish }).eq('id', serviceId)
  }
}
