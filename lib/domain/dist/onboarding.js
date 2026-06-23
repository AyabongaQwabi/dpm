"use strict";
// Phase 3: Implement provider onboarding step sequencing per business logic Section 1.
// Pure functions only — no framework imports (ARCH-006).
exports.__esModule = true;
exports.evaluatePublishEligibility = exports.evaluateStepCompletion = exports.resolveStepSequence = void 0;
// ---------- 1.1 Step sequencing resolution ----------
//
// ONB-LOGIC-001: category-level steps BEFORE type-level steps.
// ONB-LOGIC-002: step_number is scoped independently within each group — do not interleave.
// ONB-LOGIC-003: ordinal positions 1..N are assigned across the merged sequence.
function resolveStepSequence(categoryId, providerTypeId, allFormConfigs) {
    var categorySteps = allFormConfigs
        .filter(function (fc) { return fc.categoryId === categoryId && fc.providerTypeId === null; })
        .sort(function (a, b) { return a.stepNumber - b.stepNumber; });
    var typeSteps = allFormConfigs
        .filter(function (fc) { return fc.providerTypeId === providerTypeId && fc.categoryId === null; })
        .sort(function (a, b) { return a.stepNumber - b.stepNumber; });
    var merged = [];
    var position = 1;
    for (var _i = 0, categorySteps_1 = categorySteps; _i < categorySteps_1.length; _i++) {
        var fc = categorySteps_1[_i];
        merged.push({
            position: position,
            formConfigId: fc.id,
            stepTitle: fc.stepTitle,
            source: "category"
        });
        position++;
    }
    for (var _a = 0, typeSteps_1 = typeSteps; _a < typeSteps_1.length; _a++) {
        var fc = typeSteps_1[_a];
        merged.push({
            position: position,
            formConfigId: fc.id,
            stepTitle: fc.stepTitle,
            source: "type"
        });
        position++;
    }
    return merged;
}
exports.resolveStepSequence = resolveStepSequence;
function evaluateStepCompletion(input) {
    var fieldsForStep = input.formConfigFields.filter(function (f) { return f.formConfigId === input.formConfigId; });
    var valueMap = new Map(input.providerFieldValues
        .filter(function (v) { return v.providerId === input.providerId; })
        .map(function (v) { return [v.fieldId, v.value]; }));
    var missingOrInvalid = [];
    var _loop_1 = function (fcf) {
        if (!fcf.isRequired)
            return "continue";
        // Prefer provider_field_values; fall back to providers column value by field key.
        var value = valueMap.get(fcf.fieldId);
        if (!isValuePresent(value) && input.providerColumnValues) {
            var fieldDef_1 = input.fieldDefs.find(function (f) { return f.id === fcf.fieldId; });
            if (fieldDef_1) {
                var colVal = input.providerColumnValues.get(fieldDef_1.key);
                if (isValuePresent(colVal))
                    value = colVal;
            }
        }
        if (!isValuePresent(value)) {
            missingOrInvalid.push(fcf.fieldId);
            return "continue";
        }
        var fieldDef = input.fieldDefs.find(function (f) { return f.id === fcf.fieldId; });
        if (fieldDef && !passesValidatorConfig(value, fieldDef.validatorConfig)) {
            missingOrInvalid.push(fcf.fieldId);
        }
    };
    for (var _i = 0, fieldsForStep_1 = fieldsForStep; _i < fieldsForStep_1.length; _i++) {
        var fcf = fieldsForStep_1[_i];
        _loop_1(fcf);
    }
    if (missingOrInvalid.length === 0) {
        return { complete: true };
    }
    console.log("evaluateStepCompletion: missingOrInvalid", missingOrInvalid);
    return { complete: false, missingOrInvalidFieldIds: missingOrInvalid };
}
exports.evaluateStepCompletion = evaluateStepCompletion;
function isValuePresent(value) {
    if (value === null || value === undefined)
        return false;
    if (typeof value === "string" && value.trim() === "")
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    return true;
}
// Applies validator_config rules. Currently supports min/max for numbers and
// minLength/maxLength for strings. Extend as PRD DYN-005 rules are formalised.
function passesValidatorConfig(value, validatorConfig) {
    if (!validatorConfig || typeof validatorConfig !== "object")
        return true;
    var cfg = validatorConfig;
    if (typeof value === "number") {
        if (typeof cfg.min === "number" && value < cfg.min)
            return false;
        if (typeof cfg.max === "number" && value > cfg.max)
            return false;
    }
    if (typeof value === "string") {
        if (typeof cfg.minLength === "number" && value.length < cfg.minLength)
            return false;
        if (typeof cfg.maxLength === "number" && value.length > cfg.maxLength)
            return false;
        if (cfg.pattern && typeof cfg.pattern === "string") {
            // Named patterns map to well-known validators; raw strings are treated as regex.
            if (cfg.pattern === "phone") {
                if (!/^[+\d][\d\s\-().]{6,}$/.test(value.trim()))
                    return false;
            }
            else if (cfg.pattern === "url") {
                try {
                    new URL(value);
                }
                catch (_a) {
                    return false;
                }
            }
            else {
                if (!new RegExp(cfg.pattern).test(value))
                    return false;
            }
        }
    }
    return true;
}
function evaluatePublishEligibility(input) {
    var incompleteStepPositions = [];
    for (var _i = 0, _a = input.resolvedSteps; _i < _a.length; _i++) {
        var step = _a[_i];
        var result = evaluateStepCompletion({
            formConfigId: step.formConfigId,
            formConfigFields: input.formConfigFields,
            fieldDefs: input.fieldDefs,
            providerFieldValues: input.providerFieldValues,
            providerId: input.providerId,
            providerColumnValues: input.providerColumnValues
        });
        if (!result.complete) {
            incompleteStepPositions.push(step.position);
        }
    }
    return {
        shouldPublish: incompleteStepPositions.length === 0 && input.resolvedSteps.length > 0,
        incompleteStepPositions: incompleteStepPositions
    };
}
exports.evaluatePublishEligibility = evaluatePublishEligibility;
