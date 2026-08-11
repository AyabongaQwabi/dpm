'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  resolveStepSequence,
  evaluateStepCompletion,
  evaluatePublishEligibility,
} from '@/lib/domain/onboarding'
import { generateProviderSlug } from '@/lib/domain/slug'
import { hasEntitlement } from '@/lib/actions/pro-membership'
import { ENTITLEMENT_KEYS, FREE_TIER_GALLERY_IMAGE_CAP, PRO_GALLERY_IMAGE_CAP } from '@/lib/entitlements'
import { enqueueNurtureSequence, processImmediateNurtureWelcome } from '@/lib/actions/nurture-emails'

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  return user.id
}

// ---- Action: create provider profile (type selection, step 0 → 1) ----

export async function createProviderProfile(formData: FormData) {
  const authUserId = await getAuthUserId()
  const supabase = await createClient()

  // Guard: don't create a second row if one already exists.
  const { data: existing } = await supabase
    .from('providers')
    .select('id')
    .eq('auth_provider_id', authUserId)
    .single()

  if (existing) redirect('/provider-dashboard/onboarding')

  const providerTypeId = formData.get('providerTypeId') as string
  if (!providerTypeId) redirect('/provider-dashboard/onboarding?error=select-type')

  const { data: providerType } = await supabase
    .from('provider_types')
    .select('id')
    .eq('id', providerTypeId)
    .single()

  if (!providerType) redirect('/provider-dashboard/onboarding?error=invalid-type')

  const admin = createAdminClient()
  const { data: provider } = await admin.from('providers').insert({
    auth_provider_id: authUserId,
    provider_type_id: providerTypeId,
    business_name: '',
    onboarding_step: 0,
    is_published: false,
  }).select('id').single()

  const { data: userData } = await admin.auth.admin.getUserById(authUserId)
  const email = userData?.user?.email
  const name = typeof userData?.user?.user_metadata?.name === 'string'
    ? userData.user.user_metadata.name
    : null

  if (provider?.id && email) {
    await enqueueNurtureSequence({
      audience: 'provider',
      recipientId: provider.id,
      email,
      name,
    })
    await processImmediateNurtureWelcome('provider', provider.id)
  }

  redirect('/provider-dashboard/onboarding')
}

// ---- Action: save step field values ----

export async function saveOnboardingStep(formData: FormData) {
  const authUserId = await getAuthUserId()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select(`
      id,
      provider_type_id,
      onboarding_step,
      business_name,
      bio,
      profile_image,
      slug,
      location_city,
      claim_status,
      provider_types!inner(id, category_id)
    `)
    .eq('auth_provider_id', authUserId)
    .single()

  if (!provider) redirect('/provider-dashboard/onboarding')

  const stepPosition = Number(formData.get('__stepPosition'))
  if (!Number.isFinite(stepPosition)) {
    revalidatePath('/provider-dashboard/onboarding')
    return
  }

  const providerType = Array.isArray(provider.provider_types)
    ? provider.provider_types[0]
    : provider.provider_types
  const categoryId = (providerType as { category_id: string } | null)?.category_id ?? ''

  // Resolve the full step sequence for this provider.
  const { data: allFormConfigRows } = await supabase
    .from('form_configs')
    .select('id, provider_type_id, category_id, step_number, step_title')
    .or(`category_id.eq.${categoryId},provider_type_id.eq.${provider.provider_type_id}`)

  const resolvedSteps = resolveStepSequence(
    categoryId,
    provider.provider_type_id,
    (allFormConfigRows ?? []).map((r) => ({
      id: r.id,
      providerTypeId: r.provider_type_id,
      categoryId: r.category_id,
      stepNumber: r.step_number,
      stepTitle: r.step_title,
    })),
  )

  const step = resolvedSteps.find((s) => s.position === stepPosition)
  if (!step) {
    revalidatePath('/provider-dashboard/onboarding')
    return
  }

  // Collect fields for this step.
  const { data: formConfigFieldRows } = await supabase
    .from('form_config_fields')
    .select('field_id, form_config_id, is_required, field:fields(id, key, input_type)')
    .eq('form_config_id', step.formConfigId)

  const fcfRows = formConfigFieldRows ?? []

  // Fields that live as dedicated columns on providers — NOT written to
  // provider_field_values. The completion evaluator reads them via providerColumnValues.
  const PROVIDER_COLUMN_KEYS = new Set(['business_name', 'bio', 'profile_image', 'location_city'])

  // Gallery cap: free tier is capped, pro.gallery_expanded raises it (Batch B).
  // Checked once here rather than per-field since only one field key ('gallery')
  // can trip it.
  const galleryExpanded = await hasEntitlement(provider.id, ENTITLEMENT_KEYS.GALLERY_EXPANDED)
  const galleryCap = galleryExpanded ? PRO_GALLERY_IMAGE_CAP : FREE_TIER_GALLERY_IMAGE_CAP

  // Build upsert rows — skip provider-column fields, they go to providerColumnUpdate.
  const upsertRows = fcfRows
    .map((fcf) => {
      const field = Array.isArray(fcf.field) ? fcf.field[0] : fcf.field
      if (!field) return null
      if (PROVIDER_COLUMN_KEYS.has(field.key)) return null
      const rawValue = formData.get(field.key)
      if (rawValue === null) return null
      const value: unknown =
        field.input_type === 'number'
          ? Number(rawValue)
          : field.input_type === 'boolean'
            ? rawValue === 'true'
            : field.input_type === 'multi_select' || field.input_type === 'tag_picker'
              ? formData.getAll(field.key)
              : field.key === 'gallery'
                ? (() => {
                    try {
                      const p = JSON.parse(String(rawValue))
                      return Array.isArray(p) ? p.slice(0, galleryCap) : []
                    } catch {
                      return []
                    }
                  })()
                : String(rawValue)
      return { provider_id: provider.id, field_id: fcf.field_id, value }
    })
    .filter((r): r is { provider_id: string; field_id: string; value: unknown } => r !== null)

  const businessName = formData.get('business_name') as string | null
  const bio = formData.get('bio') as string | null
  const profileImage = formData.get('profile_image') as string | null
  const locationCity = formData.get('location_city') as string | null
  const socialLinksRaw = formData.get('__social_links')
  const languagesRaw = formData.get('__languages')
  const portfolioRaw = formData.get('__portfolio')
  const faqsRaw = formData.get('__faqs')
  const linksRaw = formData.get('__links')

  function parseJsonArray(raw: FormDataEntryValue | null): unknown[] | null {
    if (raw === null) return null
    try { const p = JSON.parse(String(raw)); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  const providerColumnUpdate: Record<string, unknown> = {}
  if (businessName !== null) providerColumnUpdate.business_name = businessName
  if (bio !== null) providerColumnUpdate.bio = bio
  if (profileImage !== null && profileImage !== '') providerColumnUpdate.profile_image = profileImage
  if (locationCity !== null) providerColumnUpdate.location_city = locationCity

  if (businessName?.trim() && !provider.slug) {
    const { data: slugRows } = await admin.from('providers').select('slug').not('slug', 'is', null)
    const existingSlugs = (slugRows ?? []).map((r) => r.slug).filter((s): s is string => Boolean(s))
    providerColumnUpdate.slug = generateProviderSlug({
      businessName: businessName.trim(),
      city: locationCity ?? provider.location_city,
      existingSlugs,
    })
  }

  const socialLinks = parseJsonArray(socialLinksRaw)
  if (socialLinks !== null) providerColumnUpdate.social_links = socialLinks

  const languages = parseJsonArray(languagesRaw)
  if (languages !== null) providerColumnUpdate.languages = languages

  const portfolio = parseJsonArray(portfolioRaw)
  if (portfolio !== null) providerColumnUpdate.portfolio = portfolio

  const faqs = parseJsonArray(faqsRaw)
  if (faqs !== null) providerColumnUpdate.faqs = faqs

  const links = parseJsonArray(linksRaw)
  if (links !== null) providerColumnUpdate.links = links

  await Promise.all([
    upsertRows.length > 0
      ? admin
          .from('provider_field_values')
          .upsert(upsertRows, { onConflict: 'provider_id,field_id' })
      : Promise.resolve(),
    Object.keys(providerColumnUpdate).length > 0
      ? admin
          .from('providers')
          .update(providerColumnUpdate)
          .eq('id', provider.id)
      : Promise.resolve(),
  ])

  // Reconcile provider_field_values → providers columns.
  // After every save, fetch all field values and sync any that map to a
  // dedicated providers column so the two stores never diverge.
  const { data: allValuesForReconcile } = await supabase
    .from('provider_field_values')
    .select('field_id, value, field:fields(key)')
    .eq('provider_id', provider.id)

  const FIELD_KEY_TO_COLUMN: Record<string, string> = {
    profile_image: 'profile_image',
    business_name: 'business_name',
    bio: 'bio',
    location_city: 'location_city',
  }

  const reconcileUpdate: Record<string, unknown> = {}
  for (const row of allValuesForReconcile ?? []) {
    const field = Array.isArray(row.field) ? row.field[0] : row.field
    if (!field) continue
    const col = FIELD_KEY_TO_COLUMN[field.key]
    if (col && !(col in providerColumnUpdate)) {
      // Only sync if we didn't already write this column in the current save
      reconcileUpdate[col] = row.value
    }
  }

  if (Object.keys(reconcileUpdate).length > 0) {
    await admin.from('providers').update(reconcileUpdate).eq('id', provider.id)
  }

  // Re-fetch updated field values for completion evaluation.
  const { data: freshValues } = await supabase
    .from('provider_field_values')
    .select('provider_id, field_id, value')
    .eq('provider_id', provider.id)

  const { data: allFieldDefs } = await supabase
    .from('fields')
    .select('id, key, validator_config')
    .in('id', fcfRows.map((f) => f.field_id))

  // Build a map of providers-column values so the evaluator can fall back to
  // them for fields like business_name / bio that mirror to both stores.
  const providerColumnValues = new Map<string, unknown>([
    ['business_name', businessName ?? provider.business_name ?? ''],
    ['bio', bio ?? provider.bio ?? ''],
    ['profile_image', profileImage ?? provider.profile_image ?? ''],
    ['location_city', locationCity ?? provider.location_city ?? ''],
  ])

  const stepResult = evaluateStepCompletion({
    formConfigId: step.formConfigId,
    formConfigFields: fcfRows.map((f) => ({
      formConfigId: f.form_config_id,
      fieldId: f.field_id,
      isRequired: f.is_required,
    })),
    fieldDefs: (allFieldDefs ?? []).map((f) => ({
      id: f.id,
      key: f.key,
      validatorConfig: f.validator_config,
    })),
    providerFieldValues: (freshValues ?? []).map((v) => ({
      providerId: v.provider_id,
      fieldId: v.field_id,
      value: v.value,
    })),
    providerId: provider.id,
    providerColumnValues,
  })

  if (stepResult.complete && stepPosition > provider.onboarding_step) {
    await admin
      .from('providers')
      .update({ onboarding_step: stepPosition })
      .eq('id', provider.id)
  }

  // Evaluate publish eligibility across all steps.
  const allFormConfigIds = resolvedSteps.map((s) => s.formConfigId)

  const { data: allFcfRows } = await supabase
    .from('form_config_fields')
    .select('form_config_id, field_id, is_required')
    .in('form_config_id', allFormConfigIds)

  const { data: allFieldDefsForPublish } = await supabase
    .from('fields')
    .select('id, key, validator_config')
    .in('id', (allFcfRows ?? []).map((f) => f.field_id))

  const { data: allFieldValues } = await supabase
    .from('provider_field_values')
    .select('provider_id, field_id, value')
    .eq('provider_id', provider.id)

  const publishCheck = evaluatePublishEligibility({
    resolvedSteps,
    formConfigFields: (allFcfRows ?? []).map((f) => ({
      formConfigId: f.form_config_id,
      fieldId: f.field_id,
      isRequired: f.is_required,
    })),
    fieldDefs: (allFieldDefsForPublish ?? []).map((f) => ({
      id: f.id,
      key: f.key,
      validatorConfig: f.validator_config,
    })),
    providerFieldValues: (allFieldValues ?? []).map((v) => ({
      providerId: v.provider_id,
      fieldId: v.field_id,
      value: v.value,
    })),
    providerId: provider.id,
    providerColumnValues,
  })

  await admin
    .from('providers')
    .update({ is_published: publishCheck.shouldPublish })
    .eq('id', provider.id)

  const isLastStep = stepPosition === resolvedSteps[resolvedSteps.length - 1]?.position
  if (isLastStep) {
    if (provider.claim_status !== 'claimed') {
      await admin.from('providers').update({ claim_status: 'claimed' }).eq('id', provider.id)
    }
    redirect('/provider-dashboard/onboarding/package')
  }
  redirect(`/provider-dashboard/onboarding?step=${stepPosition + 1}`)
}
