// Phase 3: Implement provider onboarding step sequencing per business logic Section 1.
// Pure functions only — no framework imports (ARCH-006).

// ---------- Types mirroring schema fields used by this module ----------

export interface FormConfigRow {
  id: string;
  providerTypeId: string | null;
  categoryId: string | null;
  stepNumber: number;
  stepTitle: string;
}

export interface FormConfigFieldRow {
  formConfigId: string;
  fieldId: string;
  isRequired: boolean;
}

export interface FieldRow {
  id: string;
  key: string;
  validatorConfig: unknown | null;
}

export interface ProviderFieldValueRow {
  providerId: string;
  fieldId: string;
  value: unknown;
}

// A resolved step is a form_config with its ordinal position in the final sequence.
export interface ResolvedStep {
  position: number; // 1-based ordinal position in the merged sequence
  formConfigId: string;
  stepTitle: string;
  source: "category" | "type";
}

// ---------- 1.1 Step sequencing resolution ----------
//
// ONB-LOGIC-001: category-level steps BEFORE type-level steps.
// ONB-LOGIC-002: step_number is scoped independently within each group — do not interleave.
// ONB-LOGIC-003: ordinal positions 1..N are assigned across the merged sequence.

export function resolveStepSequence(
  categoryId: string,
  providerTypeId: string,
  allFormConfigs: FormConfigRow[],
): ResolvedStep[] {
  const categorySteps = allFormConfigs
    .filter((fc) => fc.categoryId === categoryId && fc.providerTypeId === null)
    .sort((a, b) => a.stepNumber - b.stepNumber);

  const typeSteps = allFormConfigs
    .filter((fc) => fc.providerTypeId === providerTypeId && fc.categoryId === null)
    .sort((a, b) => a.stepNumber - b.stepNumber);

  const merged: ResolvedStep[] = [];
  let position = 1;

  for (const fc of categorySteps) {
    merged.push({
      position,
      formConfigId: fc.id,
      stepTitle: fc.stepTitle,
      source: "category",
    });
    position++;
  }

  for (const fc of typeSteps) {
    merged.push({
      position,
      formConfigId: fc.id,
      stepTitle: fc.stepTitle,
      source: "type",
    });
    position++;
  }

  return merged;
}

// ---------- 1.2 Step completion evaluation ----------
//
// ONB-LOGIC-004: every is_required field must have a non-empty value passing validator_config.
// ONB-LOGIC-005: optional fields never block completion.

export interface StepCompletionInput {
  formConfigId: string;
  formConfigFields: FormConfigFieldRow[];
  fieldDefs: FieldRow[];
  providerFieldValues: ProviderFieldValueRow[];
  providerId: string;
  // Values from providers table columns, keyed by field key (e.g. 'business_name').
  // These supplement provider_field_values for fields that mirror to both stores.
  providerColumnValues?: Map<string, unknown>;
}

export type StepCompletionResult =
  | { complete: true }
  | { complete: false; missingOrInvalidFieldIds: string[] };

export function evaluateStepCompletion(
  input: StepCompletionInput,
): StepCompletionResult {
  const fieldsForStep = input.formConfigFields.filter(
    (f) => f.formConfigId === input.formConfigId,
  );

  const valueMap = new Map<string, unknown>(
    input.providerFieldValues
      .filter((v) => v.providerId === input.providerId)
      .map((v) => [v.fieldId, v.value]),
  );

  const missingOrInvalid: string[] = [];

  for (const fcf of fieldsForStep) {
    if (!fcf.isRequired) continue;

    // Prefer provider_field_values; fall back to providers column value by field key.
    let value = valueMap.get(fcf.fieldId);
    if (!isValuePresent(value) && input.providerColumnValues) {
      const fieldDef = input.fieldDefs.find((f) => f.id === fcf.fieldId);
      if (fieldDef) {
        const colVal = input.providerColumnValues.get(fieldDef.key);
        if (isValuePresent(colVal)) value = colVal;
      }
    }

    if (!isValuePresent(value)) {
      missingOrInvalid.push(fcf.fieldId);
      continue;
    }

    const fieldDef = input.fieldDefs.find((f) => f.id === fcf.fieldId);
    if (fieldDef && !passesValidatorConfig(value, fieldDef.validatorConfig)) {
      missingOrInvalid.push(fcf.fieldId);
    }
  }

  if (missingOrInvalid.length === 0) {
    return { complete: true };
  }
  return { complete: false, missingOrInvalidFieldIds: missingOrInvalid };
}

function isValuePresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

// Applies validator_config rules. Currently supports min/max for numbers and
// minLength/maxLength for strings. Extend as PRD DYN-005 rules are formalised.
function passesValidatorConfig(value: unknown, validatorConfig: unknown): boolean {
  if (!validatorConfig || typeof validatorConfig !== "object") return true;
  const cfg = validatorConfig as Record<string, unknown>;

  if (typeof value === "number") {
    if (typeof cfg.min === "number" && value < cfg.min) return false;
    if (typeof cfg.max === "number" && value > cfg.max) return false;
  }

  if (typeof value === "string") {
    if (typeof cfg.minLength === "number" && value.length < cfg.minLength)
      return false;
    if (typeof cfg.maxLength === "number" && value.length > cfg.maxLength)
      return false;
    if (cfg.pattern && typeof cfg.pattern === "string") {
      // Named patterns map to well-known validators; raw strings are treated as regex.
      if (cfg.pattern === "phone") {
        if (!/^[+\d][\d\s\-().]{6,}$/.test(value.trim())) return false;
      } else if (cfg.pattern === "url") {
        try { new URL(value) } catch { return false }
      } else {
        if (!new RegExp(cfg.pattern).test(value)) return false;
      }
    }
  }

  return true;
}

// ---------- 1.3 Publish trigger ----------
//
// ONB-LOGIC-008: auto-publish when the LAST step in the resolved sequence completes.
// ONB-LOGIC-009: unpublish immediately if any step reverts to incomplete.

export interface PublishCheckInput {
  resolvedSteps: ResolvedStep[];
  formConfigFields: FormConfigFieldRow[];
  fieldDefs: FieldRow[];
  providerFieldValues: ProviderFieldValueRow[];
  providerId: string;
  providerColumnValues?: Map<string, unknown>;
}

export interface PublishCheckResult {
  shouldPublish: boolean;
  // Position of each incomplete step (1-based).
  incompleteStepPositions: number[];
}

export function evaluatePublishEligibility(
  input: PublishCheckInput,
): PublishCheckResult {
  const incompleteStepPositions: number[] = [];

  for (const step of input.resolvedSteps) {
    const result = evaluateStepCompletion({
      formConfigId: step.formConfigId,
      formConfigFields: input.formConfigFields,
      fieldDefs: input.fieldDefs,
      providerFieldValues: input.providerFieldValues,
      providerId: input.providerId,
      providerColumnValues: input.providerColumnValues,
    });

    if (!result.complete) {
      incompleteStepPositions.push(step.position);
    }
  }

  return {
    shouldPublish: incompleteStepPositions.length === 0 && input.resolvedSteps.length > 0,
    incompleteStepPositions,
  };
}
