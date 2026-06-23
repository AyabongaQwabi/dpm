import { describe, it, expect } from "vitest";
import {
  resolveStepSequence,
  evaluateStepCompletion,
  evaluatePublishEligibility,
  type FormConfigRow,
  type FormConfigFieldRow,
  type FieldRow,
  type ProviderFieldValueRow,
} from "../onboarding";

// ---------- Shared fixtures ----------

// Mirrors the worked example in Section 1.1:
// Category: events (cat-1)
// Type: caterer (type-1)
// Category steps: [1] Business basics, [2] Service area & capacity
// Type steps:     [1] Cuisine & dietary info, [2] Sample menu uploads

const formConfigs: FormConfigRow[] = [
  // category-level steps
  { id: "fc-cat-1", categoryId: "cat-1", providerTypeId: null, stepNumber: 1, stepTitle: "Business basics" },
  { id: "fc-cat-2", categoryId: "cat-1", providerTypeId: null, stepNumber: 2, stepTitle: "Service area & capacity" },
  // type-level steps
  { id: "fc-type-1", categoryId: null, providerTypeId: "type-1", stepNumber: 1, stepTitle: "Cuisine & dietary info" },
  { id: "fc-type-2", categoryId: null, providerTypeId: "type-1", stepNumber: 2, stepTitle: "Sample menu uploads" },
];

// ---------- 1.1 Step sequencing ----------

describe("resolveStepSequence", () => {
  it("places category steps before type steps (ONB-LOGIC-001)", () => {
    const result = resolveStepSequence("cat-1", "type-1", formConfigs);
    expect(result.map((s) => s.source)).toEqual([
      "category", "category", "type", "type",
    ]);
  });

  it("assigns sequential ordinal positions 1..N regardless of raw step_number (ONB-LOGIC-003)", () => {
    const result = resolveStepSequence("cat-1", "type-1", formConfigs);
    expect(result.map((s) => s.position)).toEqual([1, 2, 3, 4]);
  });

  it("produces the exact sequence from the worked example", () => {
    const result = resolveStepSequence("cat-1", "type-1", formConfigs);
    expect(result[0].stepTitle).toBe("Business basics");
    expect(result[1].stepTitle).toBe("Service area & capacity");
    expect(result[2].stepTitle).toBe("Cuisine & dietary info");
    expect(result[3].stepTitle).toBe("Sample menu uploads");
  });

  it("does not interleave steps by raw step_number across groups (ONB-LOGIC-002)", () => {
    // Type step_number=1 should come AFTER both category steps, not between them.
    const result = resolveStepSequence("cat-1", "type-1", formConfigs);
    const typeStepPositions = result
      .filter((s) => s.source === "type")
      .map((s) => s.position);
    const catStepPositions = result
      .filter((s) => s.source === "category")
      .map((s) => s.position);
    expect(Math.max(...catStepPositions)).toBeLessThan(Math.min(...typeStepPositions));
  });

  it("works with only category steps (no type steps)", () => {
    const result = resolveStepSequence("cat-1", "unknown-type", formConfigs);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.source === "category")).toBe(true);
  });

  it("works with only type steps (no category steps)", () => {
    const result = resolveStepSequence("unknown-cat", "type-1", formConfigs);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.source === "type")).toBe(true);
  });

  it("returns empty when neither category nor type has steps", () => {
    const result = resolveStepSequence("x", "y", formConfigs);
    expect(result).toHaveLength(0);
  });
});

// ---------- 1.2 Step completion ----------

const fieldDefs: FieldRow[] = [
  { id: "field-1", key: "business_name", validatorConfig: null },
  { id: "field-2", key: "bio", validatorConfig: { minLength: 10 } },
  { id: "field-3", key: "optional_logo", validatorConfig: null },
];

const formConfigFields: FormConfigFieldRow[] = [
  { formConfigId: "fc-cat-1", fieldId: "field-1", isRequired: true },
  { formConfigId: "fc-cat-1", fieldId: "field-2", isRequired: true },
  { formConfigId: "fc-cat-1", fieldId: "field-3", isRequired: false },
];

describe("evaluateStepCompletion", () => {
  const base = {
    formConfigId: "fc-cat-1",
    formConfigFields,
    fieldDefs,
    providerId: "prov-1",
  };

  it("returns complete when all required fields are filled (ONB-LOGIC-004)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "Acme Foods" },
      { providerId: "prov-1", fieldId: "field-2", value: "We cook great food" },
    ];
    const result = evaluateStepCompletion({ ...base, providerFieldValues: values });
    expect(result.complete).toBe(true);
  });

  it("returns incomplete when a required field is missing (ONB-LOGIC-004)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "Acme Foods" },
      // field-2 missing
    ];
    const result = evaluateStepCompletion({ ...base, providerFieldValues: values });
    expect(result.complete).toBe(false);
    if (!result.complete) {
      expect(result.missingOrInvalidFieldIds).toContain("field-2");
    }
  });

  it("optional field absence does not block completion (ONB-LOGIC-005)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "Acme Foods" },
      { providerId: "prov-1", fieldId: "field-2", value: "We cook great food" },
      // field-3 (optional) absent — should not matter
    ];
    const result = evaluateStepCompletion({ ...base, providerFieldValues: values });
    expect(result.complete).toBe(true);
  });

  it("fails validation when a required field fails validator_config (ONB-LOGIC-004)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "Acme Foods" },
      { providerId: "prov-1", fieldId: "field-2", value: "short" }, // minLength=10
    ];
    const result = evaluateStepCompletion({ ...base, providerFieldValues: values });
    expect(result.complete).toBe(false);
    if (!result.complete) {
      expect(result.missingOrInvalidFieldIds).toContain("field-2");
    }
  });

  it("treats an empty string as absent (ONB-LOGIC-004)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "  " }, // whitespace only
      { providerId: "prov-1", fieldId: "field-2", value: "We cook great food" },
    ];
    const result = evaluateStepCompletion({ ...base, providerFieldValues: values });
    expect(result.complete).toBe(false);
  });
});

// ---------- 1.3 Publish trigger ----------

describe("evaluatePublishEligibility", () => {
  const resolvedSteps = resolveStepSequence("cat-1", "type-1", formConfigs);

  const allFormConfigFields: FormConfigFieldRow[] = [
    { formConfigId: "fc-cat-1", fieldId: "field-1", isRequired: true },
    { formConfigId: "fc-cat-2", fieldId: "field-4", isRequired: true },
    { formConfigId: "fc-type-1", fieldId: "field-5", isRequired: true },
    { formConfigId: "fc-type-2", fieldId: "field-6", isRequired: false },
  ];
  const allFieldDefs: FieldRow[] = [
    { id: "field-1", key: "business_name", validatorConfig: null },
    { id: "field-4", key: "service_area", validatorConfig: null },
    { id: "field-5", key: "cuisine_type", validatorConfig: null },
    { id: "field-6", key: "sample_menu_url", validatorConfig: null },
  ];

  it("should publish when all steps are complete (ONB-LOGIC-008)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "Acme Foods" },
      { providerId: "prov-1", fieldId: "field-4", value: "Queenstown" },
      { providerId: "prov-1", fieldId: "field-5", value: "Italian" },
    ];
    const result = evaluatePublishEligibility({
      resolvedSteps,
      formConfigFields: allFormConfigFields,
      fieldDefs: allFieldDefs,
      providerFieldValues: values,
      providerId: "prov-1",
    });
    expect(result.shouldPublish).toBe(true);
    expect(result.incompleteStepPositions).toHaveLength(0);
  });

  it("should not publish when any step is incomplete (ONB-LOGIC-009)", () => {
    const values: ProviderFieldValueRow[] = [
      { providerId: "prov-1", fieldId: "field-1", value: "Acme Foods" },
      // field-4 and field-5 missing
    ];
    const result = evaluatePublishEligibility({
      resolvedSteps,
      formConfigFields: allFormConfigFields,
      fieldDefs: allFieldDefs,
      providerFieldValues: values,
      providerId: "prov-1",
    });
    expect(result.shouldPublish).toBe(false);
    expect(result.incompleteStepPositions.length).toBeGreaterThan(0);
  });

  it("should not publish when there are no steps at all", () => {
    const result = evaluatePublishEligibility({
      resolvedSteps: [],
      formConfigFields: [],
      fieldDefs: [],
      providerFieldValues: [],
      providerId: "prov-1",
    });
    expect(result.shouldPublish).toBe(false);
  });
});
