// Provider onboarding page (PRD Section 7, ONB-001 through ONB-005).
// Two modes:
//   A) No Provider row yet → type selection form (createProviderProfile action).
//   B) Provider row exists → multi-step form driven by resolveStepSequence().

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  resolveStepSequence,
  evaluateStepCompletion,
} from '@/lib/domain/onboarding'
import { createProviderProfile, saveOnboardingStep } from '@/lib/actions/onboarding'
import type { InputType } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SocialLinksStep } from '@/components/provider-dashboard/SocialLinksStep'
import { LanguagesStep } from '@/components/provider-dashboard/LanguagesStep'
import { PortfolioStep } from '@/components/provider-dashboard/PortfolioStep'
import { ImageUploadField } from '@/components/provider-dashboard/ImageUploadField'
import { GalleryUploadField } from '@/components/provider-dashboard/GalleryUploadField'
import { FaqsField } from '@/components/provider-dashboard/FaqsField'
import { ExternalLinksField } from '@/components/provider-dashboard/ExternalLinksField'
import { SocialLinksField } from '@/components/provider-dashboard/SocialLinksField'
import { Icon } from '@/components/ui/Icon'

interface OnboardingPageProps {
  searchParams: Promise<{ step?: string; error?: string }>
}

// ── Mode A: type selection ─────────────────────────────────────────────────────

async function TypeSelectionView({ error }: { error: string | undefined }) {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('provider_categories')
    .select('id, name, slug, provider_types(id, name)')
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar — step 0 */}
      <div className="h-1 w-full bg-border">
        <div className="h-1 bg-primary-accent transition-all duration-500" style={{ width: '5%' }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-14 sm:py-20">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Icon.arrowRight className="w-3.5 h-3.5 rotate-180" weight="bold" />
          Back to home
        </Link>

        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent mb-3">
            <Icon.sparkle className="h-3.5 w-3.5" weight="fill" />
            Step 1 of 2
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            What kind of service do you offer?
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Select the category that best describes your work. This shapes your profile and connects you with the right customers.
          </p>
        </div>

        {error === 'select-type' && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5">
            <Icon.shield className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Please select a provider type to continue.</p>
          </div>
        )}

        <form action={createProviderProfile} className="space-y-6">
          {(categories ?? []).map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-muted/50 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat.name}</p>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(cat.provider_types ?? []).map((pt) => (
                  <label
                    key={pt.id}
                    className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-muted/30 px-4 py-3 cursor-pointer transition-all duration-150 hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:border-primary-accent has-[:checked]:bg-primary-accent/10 has-[:checked]:ring-1 has-[:checked]:ring-primary-accent"
                  >
                    <input
                      type="radio"
                      name="providerTypeId"
                      value={pt.id}
                      className="sr-only"
                    />
                    <span className="w-4 h-4 rounded-full border-2 border-border bg-card flex-shrink-0 transition-colors group-has-[:checked]:border-primary-accent group-has-[:checked]:bg-primary-accent relative">
                      <span className="absolute inset-[3px] rounded-full bg-card opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                    </span>
                    <span className="text-sm font-medium text-foreground group-has-[:checked]:text-primary-accent">{pt.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-primary-accent px-4 py-3.5 text-sm font-semibold text-primary-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.99] cursor-pointer"
          >
            Continue to profile setup
            <Icon.arrowRight className="w-4 h-4" weight="bold" />
          </button>

          <p className="text-center text-xs text-muted-foreground">
            You can update your category later from your dashboard settings.
          </p>
        </form>
      </div>
    </div>
  )
}

// ── Main page component ────────────────────────────────────────────────────────

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const params = await searchParams

  const { data: provider } = await supabase
    .from('providers')
    .select(`
      id,
      provider_type_id,
      onboarding_step,
      is_published,
      business_name,
      bio,
      profile_image,
      social_links,
      languages,
      portfolio,
      faqs,
      links,
      provider_types!inner(id, name, category_id),
      field_values:provider_field_values(provider_id, field_id, value)
    `)
    .eq('auth_provider_id', user.id)
    .single()

  // ── Mode A ──
  if (!provider) {
    return <TypeSelectionView error={params.error} />
  }

  // ── Mode B: multi-step form ──
  const providerType = Array.isArray(provider.provider_types)
    ? provider.provider_types[0]
    : provider.provider_types

  const { data: allFormConfigRows } = await supabase
    .from('form_configs')
    .select('id, provider_type_id, category_id, step_number, step_title')
    .or(`category_id.eq.${providerType?.category_id},provider_type_id.eq.${provider.provider_type_id}`)

  const resolvedSteps = resolveStepSequence(
    providerType?.category_id ?? '',
    provider.provider_type_id,
    (allFormConfigRows ?? []).map((r) => ({
      id: r.id,
      providerTypeId: r.provider_type_id,
      categoryId: r.category_id,
      stepNumber: r.step_number,
      stepTitle: r.step_title,
    })),
  )


  const requestedStep = params.step ? parseInt(params.step, 10) : null
  const nextIncomplete = resolvedSteps.find((s) => s.position > provider.onboarding_step)
  const currentStep =
    requestedStep && resolvedSteps.find((s) => s.position === requestedStep)
      ? resolvedSteps.find((s) => s.position === requestedStep)!
      : nextIncomplete ?? resolvedSteps[resolvedSteps.length - 1]

  const { data: formConfigFieldRows } = await supabase
    .from('form_config_fields')
    .select('id, form_config_id, field_id, display_order, is_required, field:fields(id, key, label, input_type, options, validator_config)')
    .eq('form_config_id', currentStep.formConfigId)
    .order('display_order', { ascending: true })

  const { data: allFormConfigFieldRows } = await supabase
    .from('form_config_fields')
    .select('id, form_config_id, field_id, is_required, field:fields(id, key, validator_config)')
    .in('form_config_id', resolvedSteps.map((s) => s.formConfigId))

  const fieldValues = (provider.field_values ?? []) as { provider_id: string; field_id: string; value: unknown }[]
  const valueMap = new Map(fieldValues.map((v) => [v.field_id, v.value]))

  // Provider-column values keyed by field key — used to pre-fill form fields
  // whose values live on the providers table rather than provider_field_values.
  // NOTE: business_name and bio are ALSO written to provider_field_values on
  // save so completion checks work; but we still read from the column here as
  // the authoritative source in case provider_field_values is stale.
  const providerColumnValueByKey = new Map<string, unknown>([
    ['business_name', provider.business_name ?? ''],
    ['bio', provider.bio ?? ''],
    ['profile_image', provider.profile_image ?? ''],
    ['faqs', provider.faqs ?? []],
    ['links', provider.links ?? []],
    ['social_links', provider.social_links ?? []],
  ])

  const allFcf = allFormConfigFieldRows ?? []

  const allFieldDefs = allFcf
    .map((f) => {
      const field = Array.isArray(f.field) ? f.field[0] : f.field
      return field ? { id: field.id, key: field.key, validatorConfig: field.validator_config } : null
    })
    .filter((f): f is { id: string; key: string; validatorConfig: unknown } => f !== null)

  const stepCompletionMap = new Map(
    resolvedSteps.map((step) => {
      const result = evaluateStepCompletion({
        formConfigId: step.formConfigId,
        formConfigFields: allFcf
          .filter((f) => f.form_config_id === step.formConfigId)
          .map((f) => ({ formConfigId: f.form_config_id, fieldId: f.field_id, isRequired: f.is_required })),
        fieldDefs: allFieldDefs,
        providerFieldValues: fieldValues.map((v) => ({
          providerId: v.provider_id,
          fieldId: v.field_id,
          value: v.value,
        })),
        providerId: provider.id,
        providerColumnValues: providerColumnValueByKey,
      })
      return [step.position, result.complete]
    }),
  )

  console.log('stepCompletionMap', stepCompletionMap)

  const completedCount = [...stepCompletionMap.values()].filter(Boolean).length
  const progressPct = resolvedSteps.length > 0
    ? Math.round((completedCount / resolvedSteps.length) * 100)
    : 0

  const isLastStep = currentStep.position === resolvedSteps.length

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top progress bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border">
        <div
          className="h-1 bg-primary-accent transition-all duration-700"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Profile ${progressPct}% complete`}
        />
      </div>

      {/* ── Top navigation strip ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display font-bold text-base tracking-tight text-foreground">
              Service Pros
            </Link>
            <span className="hidden sm:block text-border select-none">·</span>
            <span className="hidden sm:block text-sm text-muted-foreground">{providerType?.name} profile setup</span>
          </div>

          <div className="flex items-center gap-3">
            {provider.is_published && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Icon.verified className="w-3 h-3" weight="fill" />
                Live
              </span>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{resolvedSteps.length} complete
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex gap-8">
          {/* ── Sidebar step navigator ── */}
          <aside className="w-56 flex-shrink-0 hidden md:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                Your steps
              </p>
              <nav aria-label="Onboarding steps">
                <ol className="space-y-0.5">
                  {resolvedSteps.map((step) => {
                    const done = stepCompletionMap.get(step.position)
                    const active = step.position === currentStep.position
                    return (
                      <li key={step.position}>
                        <a
                          href={`/provider-dashboard/onboarding?step=${step.position}`}
                          aria-current={active ? 'step' : undefined}
                          className={[
                            'group flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer',
                            active
                              ? 'bg-primary-accent/10 text-primary-accent font-semibold'
                              : done
                                ? 'text-foreground hover:bg-muted hover:text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-colors',
                              active
                                ? 'border-primary-accent bg-primary-accent text-primary-accent-foreground'
                                : done
                                  ? 'border-primary/40 bg-primary/10 text-primary'
                                  : 'border-border bg-card text-muted-foreground',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {done && !active
                              ? <Icon.verified className="w-3 h-3" weight="fill" />
                              : step.position}
                          </span>
                          <span className="truncate leading-tight">{step.stepTitle}</span>
                        </a>
                      </li>
                    )
                  })}
                </ol>
              </nav>

              {/* Profile strength card */}
              <div className="mt-6 rounded-[var(--radius)] bg-muted/60 border border-border px-4 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-foreground">Profile strength</p>
                  <p className="text-xs font-bold text-primary-accent">{progressPct}%</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-primary-accent transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {progressPct < 100 ? (
                  <p className="mt-2 text-xs text-muted-foreground leading-snug">
                    Complete all steps to go live and start getting bookings.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-primary font-medium leading-snug">
                    All done! Your profile is ready to publish.
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* ── Main step form ── */}
          <div className="flex-1 min-w-0">
            {/* Mobile step strip */}
            <div className="md:hidden mb-5 overflow-x-auto">
              <div className="flex gap-2 pb-1 min-w-max">
                {resolvedSteps.map((step) => {
                  const done = stepCompletionMap.get(step.position)
                  const active = step.position === currentStep.position
                  return (
                    <a
                      key={step.position}
                      href={`/provider-dashboard/onboarding?step=${step.position}`}
                      aria-current={active ? 'step' : undefined}
                      className={[
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer border',
                        active
                          ? 'bg-primary-accent border-primary-accent text-primary-accent-foreground'
                          : done
                            ? 'border-primary/20 bg-primary/8 text-primary'
                            : 'border-border bg-card text-muted-foreground',
                      ].join(' ')}
                    >
                      {done && !active
                        ? <Icon.verified className="w-3 h-3" weight="fill" />
                        : <span>{step.position}</span>}
                      {step.stepTitle}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Step card */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="border-b border-border bg-muted/40 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-2.5 py-0.5 text-xs font-semibold text-primary-accent mb-1">
                      Step {currentStep.position} of {resolvedSteps.length}
                    </span>
                    <h1 className="font-display text-xl font-bold text-foreground">{currentStep.stepTitle}</h1>
                  </div>
                  {stepCompletionMap.get(currentStep.position) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary shrink-0">
                      <Icon.verified className="w-3 h-3" weight="fill" />
                      Saved
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="px-6 py-6">
                {currentStep.stepTitle === 'Social Links' ? (
                  <SocialLinksStep
                    stepPosition={currentStep.position}
                    isLast={isLastStep}
                    prevStep={currentStep.position > 1 ? currentStep.position - 1 : null}
                    nextStep={isLastStep ? null : currentStep.position + 1}
                    savedLinks={(provider.social_links as { platform: string; url: string }[] | null) ?? []}
                  />
                ) : currentStep.stepTitle === 'Languages' ? (
                  <LanguagesStep
                    stepPosition={currentStep.position}
                    isLast={isLastStep}
                    prevStep={currentStep.position > 1 ? currentStep.position - 1 : null}
                    nextStep={isLastStep ? null : currentStep.position + 1}
                    savedLanguages={(provider.languages as string[] | null) ?? []}
                  />
                ) : currentStep.stepTitle === 'Portfolio' ? (
                  <PortfolioStep
                    stepPosition={currentStep.position}
                    isLast={isLastStep}
                    prevStep={currentStep.position > 1 ? currentStep.position - 1 : null}
                    nextStep={isLastStep ? null : currentStep.position + 1}
                    savedPortfolio={(provider.portfolio as { title: string; description: string; image_url: string; file_url: string; link: string }[] | null) ?? []}
                  />
                ) : (
                  <form action={saveOnboardingStep} className="space-y-6">
                    <input type="hidden" name="__stepPosition" value={currentStep.position} />

                    {/* bio lives on providers.bio — render it on step 1 regardless of form_config_fields */}
                    {currentStep.stepTitle === 'Business Details' && (
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium text-foreground">
                          About Your Business<span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          rows={5}
                          defaultValue={provider.bio ?? ''}
                          required
                          minLength={50}
                          className="rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-y"
                        />
                        <p className="text-xs text-muted-foreground">
                          Write at least 50 characters — customers read this before booking.
                        </p>
                      </div>
                    )}

                    {(formConfigFieldRows ?? []).map((fcf) => {
                      const field = Array.isArray(fcf.field) ? fcf.field[0] : fcf.field
                      if (!field) return null
                      return (
                        <FieldInput
                          key={field.id}
                          field={{
                            id: field.id,
                            key: field.key,
                            label: field.label,
                            inputType: field.input_type as InputType,
                            options: Array.isArray(field.options) ? (field.options as string[]) : null,
                            isRequired: fcf.is_required,
                            validatorConfig: field.validator_config as Record<string, unknown> | null,
                          }}
                          value={providerColumnValueByKey.has(field.key) ? providerColumnValueByKey.get(field.key) : valueMap.get(field.id)}
                        />
                      )
                    })}

                    {/* Navigation */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      {currentStep.position > 1 && (
                        <Button variant="outline" asChild className="rounded-[var(--radius)] cursor-pointer">
                          <a href={`/provider-dashboard/onboarding?step=${currentStep.position - 1}`}>
                            ← Back
                          </a>
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className={[
                          'flex-1 rounded-[var(--radius)] font-semibold cursor-pointer',
                          isLastStep
                            ? 'bg-primary text-primary-foreground hover:opacity-90'
                            : 'bg-primary-accent text-primary-accent-foreground hover:opacity-90',
                        ].join(' ')}
                      >
                        {isLastStep ? 'Finish & publish profile →' : 'Save & continue →'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Skip link */}
            {!isLastStep && (
              <div className="mt-4 text-center">
                <a
                  href={`/provider-dashboard/onboarding?step=${currentStep.position + 1}`}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Skip this step for now
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field renderer (DYN-003/004: data-driven, no per-type hardcoding) ─────────

function FieldInput({
  field,
  value,
}: {
  field: {
    id: string
    key: string
    label: string
    inputType: InputType
    options: string[] | null
    isRequired: boolean
    validatorConfig: Record<string, unknown> | null
  }
  value: unknown
}) {
  const strVal = value != null ? String(value) : ''
  const arrVal: string[] = Array.isArray(value) ? (value as string[]) : []
  const cfg = field.validatorConfig ?? {}
  const minLength = typeof cfg.minLength === 'number' ? cfg.minLength : undefined
  const maxLength = typeof cfg.maxLength === 'number' ? cfg.maxLength : undefined
  const minVal = typeof cfg.min === 'number' ? cfg.min : undefined
  const maxVal = typeof cfg.max === 'number' ? cfg.max : undefined

  const fieldLabel = (
    <Label htmlFor={field.key} className="text-sm font-medium text-foreground">
      {field.label}
      {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  )

  const inputClass =
    'rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring'

  // social_links has its own dedicated step — suppress it here so it doesn't
  // appear as a duplicate on step 3.
  if (field.key === 'social_links') return null
  // bio is rendered as a hardcoded field on step 1 (stored in providers.bio, not field_values)
  if (field.key === 'bio') return null

  // Key-specific overrides — must come before inputType checks because the seed
  // registers these fields with generic types (rich_text / short_text) that would
  // otherwise match first and render the wrong widget.
  if (field.key === 'faqs') {
    const saved: { question: string; answer: string }[] = Array.isArray(value)
      ? (value as { question: string; answer: string }[])
      : strVal
        ? (() => { try { const p = JSON.parse(strVal); return Array.isArray(p) ? p : [] } catch { return [] } })()
        : []
    return (
      <FaqsField
        fieldKey={field.key}
        label={field.label}
        isRequired={field.isRequired}
        saved={saved}
      />
    )
  }

  if (field.key === 'links') {
    const saved: { label: string; url: string }[] = Array.isArray(value)
      ? (value as { label: string; url: string }[])
      : strVal
        ? (() => { try { const p = JSON.parse(strVal); return Array.isArray(p) ? p : [] } catch { return [] } })()
        : []
    return (
      <ExternalLinksField
        fieldKey={field.key}
        label={field.label}
        isRequired={field.isRequired}
        saved={saved}
      />
    )
  }

  if (field.inputType === 'short_text') {
    return (
      <div className="space-y-2">
        {fieldLabel}
        <Input
          id={field.key}
          name={field.key}
          type="text"
          defaultValue={strVal}
          required={field.isRequired}
          minLength={minLength}
          maxLength={maxLength}
          className={inputClass}
        />
        {minLength && (
          <p className="text-xs text-muted-foreground">Minimum {minLength} characters.</p>
        )}
      </div>
    )
  }

  if (field.inputType === 'rich_text') {
    return (
      <div className="space-y-2">
        {fieldLabel}
        <Textarea
          id={field.key}
          name={field.key}
          rows={5}
          defaultValue={strVal}
          required={field.isRequired}
          minLength={minLength}
          maxLength={maxLength}
          className={`${inputClass} resize-y`}
        />
        <p className="text-xs text-muted-foreground">
          {minLength
            ? `Write at least ${minLength} characters — customers read this before booking.`
            : 'Write clearly and naturally — customers read this before booking.'}
        </p>
      </div>
    )
  }

  if (field.inputType === 'number') {
    return (
      <div className="space-y-2">
        {fieldLabel}
        <Input
          id={field.key}
          name={field.key}
          type="number"
          defaultValue={strVal}
          required={field.isRequired}
          min={minVal}
          max={maxVal}
          className={inputClass}
        />
      </div>
    )
  }

  if (field.inputType === 'boolean') {
    return (
      <label
        htmlFor={field.key}
        className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-muted/30 px-4 py-3 cursor-pointer transition-all hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:border-primary-accent has-[:checked]:bg-primary-accent/10 has-[:checked]:ring-1 has-[:checked]:ring-primary-accent"
      >
        <input
          id={field.key}
          name={field.key}
          type="checkbox"
          value="true"
          defaultChecked={value === true || value === 'true'}
          className="w-4 h-4 rounded border-border accent-primary-accent"
        />
        <span className="text-sm font-medium text-foreground">
          {field.label}
          {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
        </span>
      </label>
    )
  }

  if (field.inputType === 'single_select' && field.options) {
    return (
      <div className="space-y-2">
        {fieldLabel}
        <Select name={field.key} defaultValue={strVal || undefined} required={field.isRequired}>
          <SelectTrigger id={field.key} className={inputClass}>
            <SelectValue placeholder="Select an option…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if ((field.inputType === 'multi_select' || field.inputType === 'tag_picker') && field.options) {
    return (
      <div className="space-y-3">
        {fieldLabel}
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-1.5 text-sm border border-border rounded-full px-3.5 py-1.5 cursor-pointer transition-all duration-150 hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:bg-primary-accent has-[:checked]:text-primary-accent-foreground has-[:checked]:border-primary-accent bg-card text-foreground"
            >
              <input
                type="checkbox"
                name={field.key}
                value={opt}
                defaultChecked={arrVal.includes(opt)}
                className="sr-only"
              />
              {opt}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
      </div>
    )
  }

  if (field.inputType === 'image_upload' || field.inputType === 'file_upload') {
    if (field.key === 'gallery') {
      const savedUrls: string[] = Array.isArray(value)
        ? (value as string[])
        : strVal
          ? (() => { try { const p = JSON.parse(strVal); return Array.isArray(p) ? p : [strVal] } catch { return [strVal] } })()
          : []
      return (
        <GalleryUploadField
          fieldKey={field.key}
          label={field.label}
          isRequired={field.isRequired}
          savedUrls={savedUrls}
        />
      )
    }
    return (
      <ImageUploadField
        fieldKey={field.key}
        label={field.label}
        isRequired={field.isRequired}
        isImage={field.inputType === 'image_upload'}
        savedUrl={strVal || undefined}
      />
    )
  }

  // Fallback
  return (
    <div className="space-y-2">
      {fieldLabel}
      <Input
        id={field.key}
        name={field.key}
        type="text"
        defaultValue={strVal}
        required={field.isRequired}
        className={inputClass}
      />
    </div>
  )
}
