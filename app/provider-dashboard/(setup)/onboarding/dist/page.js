"use strict";
// Provider onboarding page (PRD Section 7, ONB-001 through ONB-005).
// Two modes:
//   A) No Provider row yet → type selection form (createProviderProfile action).
//   B) Provider row exists → multi-step form driven by resolveStepSequence().
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var navigation_1 = require("next/navigation");
var link_1 = require("next/link");
var server_1 = require("@/lib/supabase/server");
var onboarding_1 = require("@/lib/domain/onboarding");
var onboarding_2 = require("@/lib/actions/onboarding");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var textarea_1 = require("@/components/ui/textarea");
var select_1 = require("@/components/ui/select");
var SocialLinksStep_1 = require("@/components/provider-dashboard/SocialLinksStep");
var LanguagesStep_1 = require("@/components/provider-dashboard/LanguagesStep");
var PortfolioStep_1 = require("@/components/provider-dashboard/PortfolioStep");
var ImageUploadField_1 = require("@/components/provider-dashboard/ImageUploadField");
var GalleryUploadField_1 = require("@/components/provider-dashboard/GalleryUploadField");
var FaqsField_1 = require("@/components/provider-dashboard/FaqsField");
var ExternalLinksField_1 = require("@/components/provider-dashboard/ExternalLinksField");
var Icon_1 = require("@/components/ui/Icon");
// ── Mode A: type selection ─────────────────────────────────────────────────────
function TypeSelectionView(_a) {
    var error = _a.error;
    return __awaiter(this, void 0, void 0, function () {
        var supabase, categories;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, server_1.createClient()];
                case 1:
                    supabase = _b.sent();
                    return [4 /*yield*/, supabase
                            .from('provider_categories')
                            .select('id, name, slug, provider_types(id, name)')
                            .order('name', { ascending: true })];
                case 2:
                    categories = (_b.sent()).data;
                    return [2 /*return*/, (React.createElement("div", { className: "min-h-screen bg-background" },
                            React.createElement("div", { className: "h-1 w-full bg-border" },
                                React.createElement("div", { className: "h-1 bg-primary-accent transition-all duration-500", style: { width: '5%' } })),
                            React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-14 sm:py-20" },
                                React.createElement(link_1["default"], { href: "/", className: "mb-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" },
                                    React.createElement(Icon_1.Icon.arrowRight, { className: "w-3.5 h-3.5 rotate-180", weight: "bold" }),
                                    "Back to home"),
                                React.createElement("div", { className: "mb-8" },
                                    React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-3 py-1 text-xs font-semibold text-primary-accent mb-3" },
                                        React.createElement(Icon_1.Icon.sparkle, { className: "h-3.5 w-3.5", weight: "fill" }),
                                        "Step 1 of 2"),
                                    React.createElement("h1", { className: "font-display text-3xl font-bold tracking-tight text-foreground" }, "What kind of service do you offer?"),
                                    React.createElement("p", { className: "mt-2 text-muted-foreground text-sm" }, "Select the category that best describes your work. This shapes your profile and connects you with the right customers.")),
                                error === 'select-type' && (React.createElement("div", { className: "mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5" },
                                    React.createElement(Icon_1.Icon.shield, { className: "w-4 h-4 text-destructive shrink-0" }),
                                    React.createElement("p", { className: "text-sm text-destructive" }, "Please select a provider type to continue."))),
                                React.createElement("form", { action: onboarding_2.createProviderProfile, className: "space-y-6" },
                                    (categories !== null && categories !== void 0 ? categories : []).map(function (cat) {
                                        var _a;
                                        return (React.createElement("div", { key: cat.id, className: "rounded-2xl border border-border bg-card shadow-sm overflow-hidden" },
                                            React.createElement("div", { className: "px-5 py-3 bg-muted/50 border-b border-border" },
                                                React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, cat.name)),
                                            React.createElement("div", { className: "p-3 grid grid-cols-1 sm:grid-cols-2 gap-2" }, ((_a = cat.provider_types) !== null && _a !== void 0 ? _a : []).map(function (pt) { return (React.createElement("label", { key: pt.id, className: "group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-muted/30 px-4 py-3 cursor-pointer transition-all duration-150 hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:border-primary-accent has-[:checked]:bg-primary-accent/10 has-[:checked]:ring-1 has-[:checked]:ring-primary-accent" },
                                                React.createElement("input", { type: "radio", name: "providerTypeId", value: pt.id, className: "sr-only" }),
                                                React.createElement("span", { className: "w-4 h-4 rounded-full border-2 border-border bg-card flex-shrink-0 transition-colors group-has-[:checked]:border-primary-accent group-has-[:checked]:bg-primary-accent relative" },
                                                    React.createElement("span", { className: "absolute inset-[3px] rounded-full bg-card opacity-0 group-has-[:checked]:opacity-100 transition-opacity" })),
                                                React.createElement("span", { className: "text-sm font-medium text-foreground group-has-[:checked]:text-primary-accent" }, pt.name))); }))));
                                    }),
                                    React.createElement("button", { type: "submit", className: "w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-primary-accent px-4 py-3.5 text-sm font-semibold text-primary-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.99] cursor-pointer" },
                                        "Continue to profile setup",
                                        React.createElement(Icon_1.Icon.arrowRight, { className: "w-4 h-4", weight: "bold" })),
                                    React.createElement("p", { className: "text-center text-xs text-muted-foreground" }, "You can update your category later from your dashboard settings.")))))];
            }
        });
    });
}
// ── Main page component ────────────────────────────────────────────────────────
function OnboardingPage(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var searchParams = _a.searchParams;
    return __awaiter(this, void 0, void 0, function () {
        var supabase, user, params, provider, providerType, allFormConfigRows, resolvedSteps, requestedStep, nextIncomplete, currentStep, formConfigFieldRows, allFormConfigFieldRows, fieldValues, valueMap, providerColumnValueByKey, allFcf, allFieldDefs, stepCompletionMap, completedCount, progressPct, isLastStep;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0: return [4 /*yield*/, server_1.createClient()];
                case 1:
                    supabase = _o.sent();
                    return [4 /*yield*/, supabase.auth.getUser()];
                case 2:
                    user = (_o.sent()).data.user;
                    if (!user)
                        navigation_1.redirect('/sign-in');
                    return [4 /*yield*/, searchParams];
                case 3:
                    params = _o.sent();
                    return [4 /*yield*/, supabase
                            .from('providers')
                            .select("\n      id,\n      provider_type_id,\n      onboarding_step,\n      is_published,\n      business_name,\n      bio,\n      profile_image,\n      social_links,\n      languages,\n      portfolio,\n      faqs,\n      links,\n      provider_types!inner(id, name, category_id),\n      field_values:provider_field_values(provider_id, field_id, value)\n    ")
                            .eq('auth_provider_id', user.id)
                            .single()
                        // ── Mode A ──
                    ];
                case 4:
                    provider = (_o.sent()).data;
                    // ── Mode A ──
                    if (!provider) {
                        return [2 /*return*/, React.createElement(TypeSelectionView, { error: params.error })];
                    }
                    providerType = Array.isArray(provider.provider_types)
                        ? provider.provider_types[0]
                        : provider.provider_types;
                    return [4 /*yield*/, supabase
                            .from('form_configs')
                            .select('id, provider_type_id, category_id, step_number, step_title')
                            .or("category_id.eq." + (providerType === null || providerType === void 0 ? void 0 : providerType.category_id) + ",provider_type_id.eq." + provider.provider_type_id)];
                case 5:
                    allFormConfigRows = (_o.sent()).data;
                    resolvedSteps = onboarding_1.resolveStepSequence((_b = providerType === null || providerType === void 0 ? void 0 : providerType.category_id) !== null && _b !== void 0 ? _b : '', provider.provider_type_id, (allFormConfigRows !== null && allFormConfigRows !== void 0 ? allFormConfigRows : []).map(function (r) { return ({
                        id: r.id,
                        providerTypeId: r.provider_type_id,
                        categoryId: r.category_id,
                        stepNumber: r.step_number,
                        stepTitle: r.step_title
                    }); }));
                    requestedStep = params.step ? parseInt(params.step, 10) : null;
                    nextIncomplete = resolvedSteps.find(function (s) { return s.position > provider.onboarding_step; });
                    currentStep = requestedStep && resolvedSteps.find(function (s) { return s.position === requestedStep; })
                        ? resolvedSteps.find(function (s) { return s.position === requestedStep; })
                        : nextIncomplete !== null && nextIncomplete !== void 0 ? nextIncomplete : resolvedSteps[resolvedSteps.length - 1];
                    return [4 /*yield*/, supabase
                            .from('form_config_fields')
                            .select('id, form_config_id, field_id, display_order, is_required, field:fields(id, key, label, input_type, options)')
                            .eq('form_config_id', currentStep.formConfigId)
                            .order('display_order', { ascending: true })];
                case 6:
                    formConfigFieldRows = (_o.sent()).data;
                    return [4 /*yield*/, supabase
                            .from('form_config_fields')
                            .select('id, form_config_id, field_id, is_required, field:fields(id, key, validator_config)')["in"]('form_config_id', resolvedSteps.map(function (s) { return s.formConfigId; }))];
                case 7:
                    allFormConfigFieldRows = (_o.sent()).data;
                    fieldValues = ((_c = provider.field_values) !== null && _c !== void 0 ? _c : []);
                    valueMap = new Map(fieldValues.map(function (v) { return [v.field_id, v.value]; }));
                    providerColumnValueByKey = new Map([
                        ['business_name', (_d = provider.business_name) !== null && _d !== void 0 ? _d : ''],
                        ['bio', (_e = provider.bio) !== null && _e !== void 0 ? _e : ''],
                        ['profile_image', (_f = provider.profile_image) !== null && _f !== void 0 ? _f : ''],
                        ['faqs', (_g = provider.faqs) !== null && _g !== void 0 ? _g : []],
                        ['links', (_h = provider.links) !== null && _h !== void 0 ? _h : []],
                        ['social_links', (_j = provider.social_links) !== null && _j !== void 0 ? _j : []],
                    ]);
                    allFcf = allFormConfigFieldRows !== null && allFormConfigFieldRows !== void 0 ? allFormConfigFieldRows : [];
                    allFieldDefs = allFcf
                        .map(function (f) {
                        var field = Array.isArray(f.field) ? f.field[0] : f.field;
                        return field ? { id: field.id, key: field.key, validatorConfig: field.validator_config } : null;
                    })
                        .filter(function (f) { return f !== null; });
                    stepCompletionMap = new Map(resolvedSteps.map(function (step) {
                        var result = onboarding_1.evaluateStepCompletion({
                            formConfigId: step.formConfigId,
                            formConfigFields: allFcf
                                .filter(function (f) { return f.form_config_id === step.formConfigId; })
                                .map(function (f) { return ({ formConfigId: f.form_config_id, fieldId: f.field_id, isRequired: f.is_required }); }),
                            fieldDefs: allFieldDefs,
                            providerFieldValues: fieldValues.map(function (v) { return ({
                                providerId: v.provider_id,
                                fieldId: v.field_id,
                                value: v.value
                            }); }),
                            providerId: provider.id,
                            providerColumnValues: providerColumnValueByKey
                        });
                        return [step.position, result.complete];
                    }));
                    console.log('stepCompletionMap', stepCompletionMap);
                    completedCount = __spreadArrays(stepCompletionMap.values()).filter(Boolean).length;
                    progressPct = resolvedSteps.length > 0
                        ? Math.round((completedCount / resolvedSteps.length) * 100)
                        : 0;
                    isLastStep = currentStep.position === resolvedSteps.length;
                    return [2 /*return*/, (React.createElement("div", { className: "min-h-screen bg-background" },
                            React.createElement("div", { className: "fixed top-0 left-0 right-0 z-50 h-1 bg-border" },
                                React.createElement("div", { className: "h-1 bg-primary-accent transition-all duration-700", style: { width: progressPct + "%" }, role: "progressbar", "aria-valuenow": progressPct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Profile " + progressPct + "% complete" })),
                            React.createElement("header", { className: "sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md" },
                                React.createElement("div", { className: "max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4" },
                                    React.createElement("div", { className: "flex items-center gap-3" },
                                        React.createElement(link_1["default"], { href: "/", className: "font-display font-bold text-base tracking-tight text-foreground" }, "Service Pros"),
                                        React.createElement("span", { className: "hidden sm:block text-border select-none" }, "\u00B7"),
                                        React.createElement("span", { className: "hidden sm:block text-sm text-muted-foreground" }, providerType === null || providerType === void 0 ? void 0 :
                                            providerType.name,
                                            " profile setup")),
                                    React.createElement("div", { className: "flex items-center gap-3" },
                                        provider.is_published && (React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary" },
                                            React.createElement(Icon_1.Icon.verified, { className: "w-3 h-3", weight: "fill" }),
                                            "Live")),
                                        React.createElement("span", { className: "text-xs text-muted-foreground tabular-nums" },
                                            completedCount,
                                            "/",
                                            resolvedSteps.length,
                                            " complete")))),
                            React.createElement("div", { className: "max-w-5xl mx-auto px-4 py-8 sm:py-10" },
                                React.createElement("div", { className: "flex gap-8" },
                                    React.createElement("aside", { className: "w-56 flex-shrink-0 hidden md:block" },
                                        React.createElement("div", { className: "sticky top-24" },
                                            React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1" }, "Your steps"),
                                            React.createElement("nav", { "aria-label": "Onboarding steps" },
                                                React.createElement("ol", { className: "space-y-0.5" }, resolvedSteps.map(function (step) {
                                                    var done = stepCompletionMap.get(step.position);
                                                    var active = step.position === currentStep.position;
                                                    return (React.createElement("li", { key: step.position },
                                                        React.createElement("a", { href: "/provider-dashboard/onboarding?step=" + step.position, "aria-current": active ? 'step' : undefined, className: [
                                                                'group flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer',
                                                                active
                                                                    ? 'bg-primary-accent/10 text-primary-accent font-semibold'
                                                                    : done
                                                                        ? 'text-foreground hover:bg-muted hover:text-foreground'
                                                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                                            ].join(' ') },
                                                            React.createElement("span", { className: [
                                                                    'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-colors',
                                                                    active
                                                                        ? 'border-primary-accent bg-primary-accent text-primary-accent-foreground'
                                                                        : done
                                                                            ? 'border-primary/40 bg-primary/10 text-primary'
                                                                            : 'border-border bg-card text-muted-foreground',
                                                                ].join(' '), "aria-hidden": "true" }, done && !active
                                                                ? React.createElement(Icon_1.Icon.verified, { className: "w-3 h-3", weight: "fill" })
                                                                : step.position),
                                                            React.createElement("span", { className: "truncate leading-tight" }, step.stepTitle))));
                                                }))),
                                            React.createElement("div", { className: "mt-6 rounded-[var(--radius)] bg-muted/60 border border-border px-4 py-3.5" },
                                                React.createElement("div", { className: "flex items-center justify-between mb-1.5" },
                                                    React.createElement("p", { className: "text-xs font-semibold text-foreground" }, "Profile strength"),
                                                    React.createElement("p", { className: "text-xs font-bold text-primary-accent" },
                                                        progressPct,
                                                        "%")),
                                                React.createElement("div", { className: "h-1.5 w-full rounded-full bg-border overflow-hidden" },
                                                    React.createElement("div", { className: "h-1.5 rounded-full bg-primary-accent transition-all duration-700", style: { width: progressPct + "%" } })),
                                                progressPct < 100 ? (React.createElement("p", { className: "mt-2 text-xs text-muted-foreground leading-snug" }, "Complete all steps to go live and start getting bookings.")) : (React.createElement("p", { className: "mt-2 text-xs text-primary font-medium leading-snug" }, "All done! Your profile is ready to publish."))))),
                                    React.createElement("div", { className: "flex-1 min-w-0" },
                                        React.createElement("div", { className: "md:hidden mb-5 overflow-x-auto" },
                                            React.createElement("div", { className: "flex gap-2 pb-1 min-w-max" }, resolvedSteps.map(function (step) {
                                                var done = stepCompletionMap.get(step.position);
                                                var active = step.position === currentStep.position;
                                                return (React.createElement("a", { key: step.position, href: "/provider-dashboard/onboarding?step=" + step.position, "aria-current": active ? 'step' : undefined, className: [
                                                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer border',
                                                        active
                                                            ? 'bg-primary-accent border-primary-accent text-primary-accent-foreground'
                                                            : done
                                                                ? 'border-primary/20 bg-primary/8 text-primary'
                                                                : 'border-border bg-card text-muted-foreground',
                                                    ].join(' ') },
                                                    done && !active
                                                        ? React.createElement(Icon_1.Icon.verified, { className: "w-3 h-3", weight: "fill" })
                                                        : React.createElement("span", null, step.position),
                                                    step.stepTitle));
                                            }))),
                                        React.createElement("div", { className: "rounded-2xl border border-border bg-card shadow-sm overflow-hidden" },
                                            React.createElement("div", { className: "border-b border-border bg-muted/40 px-6 py-5" },
                                                React.createElement("div", { className: "flex items-start justify-between gap-4" },
                                                    React.createElement("div", null,
                                                        React.createElement("span", { className: "inline-flex items-center gap-1 rounded-full border border-primary-accent/30 bg-primary-accent/10 px-2.5 py-0.5 text-xs font-semibold text-primary-accent mb-1" },
                                                            "Step ",
                                                            currentStep.position,
                                                            " of ",
                                                            resolvedSteps.length),
                                                        React.createElement("h1", { className: "font-display text-xl font-bold text-foreground" }, currentStep.stepTitle)),
                                                    stepCompletionMap.get(currentStep.position) && (React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary shrink-0" },
                                                        React.createElement(Icon_1.Icon.verified, { className: "w-3 h-3", weight: "fill" }),
                                                        "Saved")))),
                                            React.createElement("div", { className: "px-6 py-6" }, currentStep.stepTitle === 'Social Links' ? (React.createElement(SocialLinksStep_1.SocialLinksStep, { stepPosition: currentStep.position, isLast: isLastStep, prevStep: currentStep.position > 1 ? currentStep.position - 1 : null, nextStep: isLastStep ? null : currentStep.position + 1, savedLinks: (_k = provider.social_links) !== null && _k !== void 0 ? _k : [] })) : currentStep.stepTitle === 'Languages' ? (React.createElement(LanguagesStep_1.LanguagesStep, { stepPosition: currentStep.position, isLast: isLastStep, prevStep: currentStep.position > 1 ? currentStep.position - 1 : null, nextStep: isLastStep ? null : currentStep.position + 1, savedLanguages: (_l = provider.languages) !== null && _l !== void 0 ? _l : [] })) : currentStep.stepTitle === 'Portfolio' ? (React.createElement(PortfolioStep_1.PortfolioStep, { stepPosition: currentStep.position, isLast: isLastStep, prevStep: currentStep.position > 1 ? currentStep.position - 1 : null, nextStep: isLastStep ? null : currentStep.position + 1, savedPortfolio: (_m = provider.portfolio) !== null && _m !== void 0 ? _m : [] })) : (React.createElement("form", { action: onboarding_2.saveOnboardingStep, className: "space-y-6" },
                                                React.createElement("input", { type: "hidden", name: "__stepPosition", value: currentStep.position }),
                                                (formConfigFieldRows !== null && formConfigFieldRows !== void 0 ? formConfigFieldRows : []).map(function (fcf) {
                                                    var field = Array.isArray(fcf.field) ? fcf.field[0] : fcf.field;
                                                    if (!field)
                                                        return null;
                                                    return (React.createElement(FieldInput, { key: field.id, field: {
                                                            id: field.id,
                                                            key: field.key,
                                                            label: field.label,
                                                            inputType: field.input_type,
                                                            options: Array.isArray(field.options) ? field.options : null,
                                                            isRequired: fcf.is_required
                                                        }, value: providerColumnValueByKey.has(field.key) ? providerColumnValueByKey.get(field.key) : valueMap.get(field.id) }));
                                                }),
                                                React.createElement("div", { className: "flex items-center gap-3 pt-2 border-t border-border" },
                                                    currentStep.position > 1 && (React.createElement(button_1.Button, { variant: "outline", asChild: true, className: "rounded-[var(--radius)] cursor-pointer" },
                                                        React.createElement("a", { href: "/provider-dashboard/onboarding?step=" + (currentStep.position - 1) }, "\u2190 Back"))),
                                                    React.createElement(button_1.Button, { type: "submit", className: [
                                                            'flex-1 rounded-[var(--radius)] font-semibold cursor-pointer',
                                                            isLastStep
                                                                ? 'bg-primary text-primary-foreground hover:opacity-90'
                                                                : 'bg-primary-accent text-primary-accent-foreground hover:opacity-90',
                                                        ].join(' ') }, isLastStep ? 'Finish & publish profile →' : 'Save & continue →')))))),
                                        !isLastStep && (React.createElement("div", { className: "mt-4 text-center" },
                                            React.createElement("a", { href: "/provider-dashboard/onboarding?step=" + (currentStep.position + 1), className: "text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer" }, "Skip this step for now"))))))))];
            }
        });
    });
}
exports["default"] = OnboardingPage;
// ── Field renderer (DYN-003/004: data-driven, no per-type hardcoding) ─────────
function FieldInput(_a) {
    var field = _a.field, value = _a.value;
    var strVal = value != null ? String(value) : '';
    var arrVal = Array.isArray(value) ? value : [];
    var fieldLabel = (React.createElement(label_1.Label, { htmlFor: field.key, className: "text-sm font-medium text-foreground" },
        field.label,
        field.isRequired && React.createElement("span", { className: "text-destructive ml-0.5" }, "*")));
    var inputClass = 'rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring';
    // social_links has its own dedicated step — suppress it here so it doesn't
    // appear as a duplicate on step 3.
    if (field.key === 'social_links')
        return null;
    // Key-specific overrides — must come before inputType checks because the seed
    // registers these fields with generic types (rich_text / short_text) that would
    // otherwise match first and render the wrong widget.
    if (field.key === 'faqs') {
        var saved = Array.isArray(value)
            ? value
            : strVal
                ? (function () { try {
                    var p = JSON.parse(strVal);
                    return Array.isArray(p) ? p : [];
                }
                catch (_a) {
                    return [];
                } })()
                : [];
        return (React.createElement(FaqsField_1.FaqsField, { fieldKey: field.key, label: field.label, isRequired: field.isRequired, saved: saved }));
    }
    if (field.key === 'links') {
        var saved = Array.isArray(value)
            ? value
            : strVal
                ? (function () { try {
                    var p = JSON.parse(strVal);
                    return Array.isArray(p) ? p : [];
                }
                catch (_a) {
                    return [];
                } })()
                : [];
        return (React.createElement(ExternalLinksField_1.ExternalLinksField, { fieldKey: field.key, label: field.label, isRequired: field.isRequired, saved: saved }));
    }
    if (field.inputType === 'short_text') {
        return (React.createElement("div", { className: "space-y-2" },
            fieldLabel,
            React.createElement(input_1.Input, { id: field.key, name: field.key, type: "text", defaultValue: strVal, required: field.isRequired, className: inputClass })));
    }
    if (field.inputType === 'rich_text') {
        return (React.createElement("div", { className: "space-y-2" },
            fieldLabel,
            React.createElement(textarea_1.Textarea, { id: field.key, name: field.key, rows: 5, defaultValue: strVal, required: field.isRequired, className: inputClass + " resize-y" }),
            React.createElement("p", { className: "text-xs text-muted-foreground" }, "Write clearly and naturally \u2014 customers read this before booking.")));
    }
    if (field.inputType === 'number') {
        return (React.createElement("div", { className: "space-y-2" },
            fieldLabel,
            React.createElement(input_1.Input, { id: field.key, name: field.key, type: "number", defaultValue: strVal, required: field.isRequired, className: inputClass })));
    }
    if (field.inputType === 'boolean') {
        return (React.createElement("label", { htmlFor: field.key, className: "flex items-center gap-3 rounded-[var(--radius)] border border-border bg-muted/30 px-4 py-3 cursor-pointer transition-all hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:border-primary-accent has-[:checked]:bg-primary-accent/10 has-[:checked]:ring-1 has-[:checked]:ring-primary-accent" },
            React.createElement("input", { id: field.key, name: field.key, type: "checkbox", value: "true", defaultChecked: value === true || value === 'true', className: "w-4 h-4 rounded border-border accent-primary-accent" }),
            React.createElement("span", { className: "text-sm font-medium text-foreground" },
                field.label,
                field.isRequired && React.createElement("span", { className: "text-destructive ml-0.5" }, "*"))));
    }
    if (field.inputType === 'single_select' && field.options) {
        return (React.createElement("div", { className: "space-y-2" },
            fieldLabel,
            React.createElement(select_1.Select, { name: field.key, defaultValue: strVal || undefined, required: field.isRequired },
                React.createElement(select_1.SelectTrigger, { id: field.key, className: inputClass },
                    React.createElement(select_1.SelectValue, { placeholder: "Select an option\u2026" })),
                React.createElement(select_1.SelectContent, null, field.options.map(function (opt) { return (React.createElement(select_1.SelectItem, { key: opt, value: opt }, opt)); })))));
    }
    if ((field.inputType === 'multi_select' || field.inputType === 'tag_picker') && field.options) {
        return (React.createElement("div", { className: "space-y-3" },
            fieldLabel,
            React.createElement("div", { className: "flex flex-wrap gap-2" }, field.options.map(function (opt) { return (React.createElement("label", { key: opt, className: "flex items-center gap-1.5 text-sm border border-border rounded-full px-3.5 py-1.5 cursor-pointer transition-all duration-150 hover:border-primary-accent/50 hover:bg-primary-accent/5 has-[:checked]:bg-primary-accent has-[:checked]:text-primary-accent-foreground has-[:checked]:border-primary-accent bg-card text-foreground" },
                React.createElement("input", { type: "checkbox", name: field.key, value: opt, defaultChecked: arrVal.includes(opt), className: "sr-only" }),
                opt)); })),
            React.createElement("p", { className: "text-xs text-muted-foreground" }, "Select all that apply.")));
    }
    if (field.inputType === 'image_upload' || field.inputType === 'file_upload') {
        if (field.key === 'gallery') {
            var savedUrls = Array.isArray(value)
                ? value
                : strVal
                    ? (function () { try {
                        var p = JSON.parse(strVal);
                        return Array.isArray(p) ? p : [strVal];
                    }
                    catch (_a) {
                        return [strVal];
                    } })()
                    : [];
            return (React.createElement(GalleryUploadField_1.GalleryUploadField, { fieldKey: field.key, label: field.label, isRequired: field.isRequired, savedUrls: savedUrls }));
        }
        return (React.createElement(ImageUploadField_1.ImageUploadField, { fieldKey: field.key, label: field.label, isRequired: field.isRequired, isImage: field.inputType === 'image_upload', savedUrl: strVal || undefined }));
    }
    // Fallback
    return (React.createElement("div", { className: "space-y-2" },
        fieldLabel,
        React.createElement(input_1.Input, { id: field.key, name: field.key, type: "text", defaultValue: strVal, required: field.isRequired, className: inputClass })));
}
