"use strict";
exports.__esModule = true;
exports.metadata = void 0;
var link_1 = require("next/link");
var Icon_1 = require("@/components/ui/Icon");
var CommissionCalculator_1 = require("@/components/pricing/CommissionCalculator");
exports.metadata = {
    title: "How pricing works — ServicePros",
    description: "R99/month to be listed. A small per-sale commission between 7.5% and 12.75%. Optional ceiling packages with perks, a discount-unlock bonus, and a hard 4% commission floor."
};
// ─── Static data (mirrors platform_config values) ────────────────────────────
var BRACKETS = [
    {
        range: "R0 – R999",
        rate: "7.5%",
        example: "R500 sale → R37.50 commission"
    },
    {
        range: "R1,000 – R4,999",
        rate: "8.5%",
        example: "R3,500 sale → R297.50 commission"
    },
    {
        range: "R5,000 – R9,999",
        rate: "9.5%",
        example: "R6,300 sale → R598.50 commission"
    },
    {
        range: "R10,000 – R49,999",
        rate: "10.0%",
        example: "R48,500 sale → R4,850 commission"
    },
    {
        range: "R50,000+",
        rate: "12.75%",
        example: "R74,300 sale → R9,473.25 commission"
    },
];
var PACKAGES = [
    {
        id: "base",
        name: "Basic",
        fee: "R99 / month",
        ceiling: null,
        badge: null,
        recommended: false,
        tagline: "Get listed and start earning. No extras, no surprises.",
        "for": "Standard commission brackets apply. No cap, no extras — just your listing and a straightforward per-sale rate.",
        saving: null,
        tempReduction: { pts: "−1.0 pt", duration: "3 months" },
        perks: [
            { label: "Platform Listing", status: "included" },
            { label: "Online Search Boost", status: "included" },
            { label: "Online AI Citations", status: "included" },
            { label: "Website Backlink", status: "included" },
            { label: "Business Management Support", status: "included" },
            { label: "Commission 12.75% & Lower", status: "included" },
            { label: "1% Commission Reduction — 3 Months", status: "included" },
            { label: "Commission Cap", status: "not-included" },
            { label: "Discount 4 Discount Bonus", status: "not-included" },
            { label: "Business Rescue", status: "not-included" },
            { label: "Free Graphic Design Service", status: "not-included" },
            { label: "Free Social Content Management Service", status: "not-included" },
        ]
    },
    {
        id: "pkg2",
        name: "10% ceiling",
        fee: "R499 / month",
        ceiling: "10%",
        badge: "Entry protection",
        recommended: false,
        tagline: "Cap your rate on big jobs. Pay less when it counts most.",
        "for": "Ideal for providers who occasionally close R10k+ jobs and want to protect against the 12.75% bracket.",
        saving: "On a R74,300 sale, pay R7,430 instead of R9,473. Save R2,043 on a single job.",
        tempReduction: { pts: "−1.6 pt", duration: "3 months" },
        perks: [
            { label: "Platform Listing", status: "included" },
            { label: "Online Search Boost", status: "included" },
            { label: "Online AI Citations", status: "included" },
            { label: "Website Backlink", status: "included" },
            { label: "Service Bookings", status: "included" },
            { label: "Commission 10% & Lower", status: "included" },
            { label: "1.6% Commission Reduction — 3 Months", status: "included" },
            { label: "2.5% Discount 4 Discount Bonus", status: "included" },
            { label: "Business Rescue", status: "included" },
            { label: "Business Management Support", status: "included" },
            { label: "Free Graphic Design Service", status: "not-included" },
            { label: "Free Social Content Management Service", status: "not-included" },
        ]
    },
    {
        id: "pkg3",
        name: "9.5% ceiling",
        fee: "R799 / month",
        ceiling: "9.5%",
        badge: "Most popular",
        recommended: true,
        tagline: "The sweet spot — real savings on every mid-to-high value job.",
        "for": "Ideal for providers who regularly close R5,000–R50,000 jobs. One large job covers the monthly fee many times over.",
        saving: "On a R75,000 sale, pay R7,125 instead of R9,562. Save R2,437 — more than 3× the monthly fee on one job.",
        tempReduction: { pts: "−2.0 pt", duration: "3 months" },
        perks: [
            { label: "Platform Listing", status: "included" },
            { label: "Online Search Boost", status: "included" },
            { label: "Online AI Citations", status: "included" },
            { label: "Website Backlink", status: "included" },
            { label: "Service Bookings", status: "included" },
            { label: "Commission 9.5% & Lower", status: "included" },
            { label: "2% Commission Reduction — 3 Months", status: "included" },
            { label: "3% Discount 4 Discount Bonus", status: "included" },
            { label: "Business Rescue", status: "included" },
            { label: "Business Management Support", status: "included" },
            { label: "Free Graphic Design Service", status: "included" },
            { label: "Free Social Content Management Service", status: "not-included" },
        ]
    },
    {
        id: "pkg4",
        name: "8.5% ceiling",
        fee: "R1,199 / month",
        ceiling: "8.5%",
        badge: "High-volume",
        recommended: false,
        tagline: "Lower rates on every job above R1,000. Savings that stack up.",
        "for": "Ideal for providers with a steady flow of mid-to-high value jobs. Savings compound across the full pipeline.",
        saving: "Every job above R1,000 is capped — the more jobs you close, the more you save.",
        tempReduction: { pts: "−3.0 pt", duration: "3 months" },
        perks: [
            { label: "Platform Listing", status: "included" },
            { label: "Online Search Boost", status: "included" },
            { label: "Online AI Citations", status: "included" },
            { label: "Website Backlink", status: "included" },
            { label: "Service Bookings", status: "included" },
            { label: "Commission 8.5% & Lower", status: "included" },
            { label: "3% Commission Reduction — 3 Months", status: "included" },
            { label: "3.5% Discount 4 Discount Bonus", status: "included" },
            { label: "Business Rescue", status: "included" },
            { label: "Business Management Support", status: "included" },
            { label: "Free Graphic Design Service", status: "included" },
            { label: "Free Social Content Management Service", status: "included" },
        ]
    },
    {
        id: "pkg5",
        name: "7.5% ceiling",
        fee: "R1,699 / month",
        ceiling: "7.5%",
        badge: "Max protection",
        recommended: false,
        tagline: "The lowest rate on every sale above R999. Maximum protection.",
        "for": "Ideal for high-ticket providers whose entire service range sits above R1,000. Maximum protection across the board.",
        saving: "Every sale above R999 is capped at 7.5% — the same rate as a R500 sale — no matter the size.",
        tempReduction: { pts: "−3.5 pt", duration: "6 months" },
        perks: [
            { label: "Platform Listing", status: "included" },
            { label: "Online Search Boost", status: "included" },
            { label: "Online AI Citations", status: "included" },
            { label: "Website Backlink", status: "included" },
            { label: "Service Bookings", status: "included" },
            { label: "Commission 7.5% & Lower", status: "included" },
            { label: "3.5% Commission Reduction — 6 Months", status: "included" },
            { label: "4.5% Discount 4 Discount Bonus (floored at 4%)", status: "included" },
            { label: "Business Rescue", status: "included" },
            { label: "Business Management Support", status: "included" },
            { label: "Free Graphic Design Service", status: "included" },
            { label: "Free Social Content Management Service", status: "included" },
        ]
    },
];
var BONUS_TABLE = [
    {
        package: "10% ceiling  (R499/mo)",
        ceiling: "10.0%",
        bonus: "−2.5 pts",
        unlocked: "7.5%"
    },
    {
        package: "9.5% ceiling  (R799/mo)",
        ceiling: "9.5%",
        bonus: "−3.0 pts",
        unlocked: "6.5%"
    },
    {
        package: "8.5% ceiling  (R1,199/mo)",
        ceiling: "8.5%",
        bonus: "−3.5 pts",
        unlocked: "5.0%"
    },
    {
        package: "7.5% ceiling  (R1,699/mo)",
        ceiling: "7.5%",
        bonus: "−4.5 pts",
        unlocked: "≥ 4%*"
    },
];
var FAQS = [
    {
        q: "Do I pay commission on every sale, or is there a monthly total?",
        a: "Every sale is evaluated independently. A R500 sale and a R23,000 sale in the same month are two separate calculations — the R500 sale pays 7.5% and the R23,000 sale pays 10%. They are never blended, averaged, or accumulated."
    },
    {
        q: "I'm on a ceiling package — do I still get the lower rate on cheap sales?",
        a: "Yes. A ceiling can only ever lower or match what standard would charge — it can never raise it. If you're on the 7.5% ceiling and you make a R500 sale (bracket 1, already at 7.5%), you simply pay 7.5% as normal. The ceiling doesn't penalise you on sales where you were already below it."
    },
    {
        q: "How do I unlock the discount bonus?",
        a: "You need to be on one of the four ceiling packages, then offer a genuine 10% discount on a service that has real sales history at its current price. Once both conditions are met, you'll be prompted in your dashboard to opt in. Full mechanics are explained in your provider dashboard once you're signed in."
    },
    {
        q: "What's the 4% commission floor?",
        a: "No matter how many discount layers are active on a single sale — ceiling, discount-unlock bonus, and temporary reduction all at once — the effective commission rate can never drop below 4%. This protects the platform's ability to cover payment processing costs on every transaction."
    },
    {
        q: "What is the temporary rate reduction add-on?",
        a: "Each package includes an associated time-limited commission reduction — for example, −3.5 percentage points for 6 months on Package 5. This can be granted as a retention perk. It stacks on top of any ceiling and discount-unlock bonus already active, subject to the 4% floor."
    },
    {
        q: "Can I change or cancel a ceiling package?",
        a: "The cancellation and notice period policy for ceiling packages hasn't been finalised yet — we'll publish the full terms before ceiling packages are available to book. We won't lock you in without making the exit terms clear upfront."
    },
    {
        q: "Is there a free trial, or is the R99 charged immediately?",
        a: "The trial and first-charge policy hasn't been confirmed yet. We'll have a clear answer here before you're asked to add any payment details during sign-up."
    },
];
// ─── Page ────────────────────────────────────────────────────────────────────
function PricingPage() {
    return (React.createElement("main", null,
        React.createElement("section", { className: "border-b bg-muted/20" },
            React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-16 lg:py-20" },
                React.createElement("div", { className: "max-w-2xl mb-3" },
                    React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "Start here"),
                    React.createElement("h1", { className: "mt-2 text-3xl font-bold tracking-tight lg:text-4xl" }, "Choose your plan"),
                    React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" },
                        "All providers pay",
                        " ",
                        React.createElement("strong", { className: "text-foreground" }, "R99/month"),
                        " to be listed. Upgrade to a ceiling package to cap your commission rate and unlock additional perks. No hidden charges.")),
                React.createElement("div", { className: "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" }, PACKAGES.map(function (pkg) { return (React.createElement("div", { key: pkg.id, className: [
                        "relative rounded-2xl border bg-card flex flex-col transition-shadow",
                        pkg.recommended
                            ? "border-primary-accent ring-2 ring-primary-accent shadow-lg"
                            : "hover:shadow-md",
                    ].join(" ") },
                    React.createElement("div", { className: "p-5 border-b" },
                        pkg.badge ? (React.createElement("span", { className: [
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3",
                                pkg.recommended
                                    ? "bg-primary-accent text-primary-accent-foreground"
                                    : "bg-primary/10 text-primary",
                            ].join(" ") }, pkg.badge)) : (React.createElement("span", { className: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3 bg-muted text-muted-foreground" }, "Standard")),
                        React.createElement("p", { className: "text-lg font-bold text-foreground leading-tight" }, pkg.fee),
                        React.createElement("p", { className: "text-xs text-muted-foreground mt-1" }, "per month"),
                        pkg.ceiling ? (React.createElement("p", { className: "text-sm mt-2 text-muted-foreground" },
                            "Pay only up to",
                            " ",
                            React.createElement("span", { className: "font-semibold text-foreground" }, pkg.ceiling),
                            " ",
                            "commision.")) : (React.createElement("p", { className: "text-sm mt-2 text-muted-foreground" }, "Standard brackets only")),
                        React.createElement("p", { className: "text-xs text-muted-foreground mt-2 leading-5" }, pkg.tagline)),
                    React.createElement("ul", { className: "p-5 flex flex-col gap-2.5 flex-1" }, pkg.perks.map(function (perk) { return (React.createElement("li", { key: perk.label, className: "flex items-start gap-2" },
                        React.createElement(PerkIcon, { status: perk.status }),
                        React.createElement("span", { className: [
                                "text-xs leading-5",
                                perk.status === "not-included"
                                    ? "text-muted-foreground/50 line-through"
                                    : perk.status === "coming-soon"
                                        ? "text-muted-foreground"
                                        : "text-foreground",
                            ].join(" ") },
                            React.createElement("span", { dangerouslySetInnerHTML: { __html: perk.label } }),
                            perk.status === "coming-soon" && (React.createElement("span", { className: "ml-1 text-[10px] font-medium text-primary-accent/80 no-underline not-italic" }, "(soon)"))))); })),
                    pkg.saving && (React.createElement("div", { className: "px-5 pb-5" },
                        React.createElement("div", { className: "rounded-lg bg-primary/5 border border-primary/10 px-3 py-2" },
                            React.createElement("p", { className: "text-[11px] text-muted-foreground leading-5" }, pkg.saving)))),
                    React.createElement("div", { className: "px-5 pb-5" },
                        React.createElement(link_1["default"], { href: "/provider-signup", className: [
                                "block w-full text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity",
                                pkg.recommended
                                    ? "bg-primary-accent text-primary-accent-foreground hover:opacity-90"
                                    : "border bg-card hover:bg-muted",
                            ].join(" ") }, pkg.id === "base" ? "Get listed" : "Get started")))); })),
                React.createElement("p", { className: "mt-5 text-xs text-muted-foreground max-w-2xl" }, "* A 4% stacking floor applies: the effective commission rate can never fall below 4% regardless of how many discount layers are active simultaneously."),
                React.createElement("div", { className: "mt-5 flex flex-wrap gap-3" },
                    React.createElement("a", { href: "#how-it-works", className: "inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted transition-colors" }, "How commission works"),
                    React.createElement("a", { href: "#calculator", className: "inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted transition-colors" }, "Try the calculator")))),
        React.createElement("section", { id: "how-it-works", className: "mx-auto max-w-5xl px-4 py-14" },
            React.createElement("div", { className: "max-w-2xl" },
                React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "The simple version"),
                React.createElement("h2", { className: "mt-2 text-2xl font-bold tracking-tight" }, "One flat fee. A small cut when you earn."),
                React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" },
                    "You pay ",
                    React.createElement("strong", { className: "text-foreground" }, "R99/month"),
                    " to be on the platform. When you make a sale, we take a commission \u2014 between ",
                    React.createElement("strong", { className: "text-foreground" }, "7.5% and 12.75%"),
                    " ",
                    "depending on what you sold it for. Each sale is calculated independently \u2014 a cheap job and an expensive job in the same month are two separate calculations, never blended or accumulated."))),
        React.createElement("section", { className: "border-y bg-muted/20" },
            React.createElement("div", { className: "mx-auto max-w-5xl px-4 py-16" },
                React.createElement("div", { className: "max-w-2xl" },
                    React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "How the rate works"),
                    React.createElement("h2", { className: "mt-2 text-2xl font-bold tracking-tight" }, "One rate, per sale, per bracket"),
                    React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" }, "Each sale is assigned one rate based on its own final price. There are five brackets. Making multiple sales in a month never pushes earlier sales into a higher bracket \u2014 every transaction stands alone.")),
                React.createElement("div", { className: "mt-8 overflow-hidden rounded-2xl border" },
                    React.createElement("table", { className: "w-full text-sm" },
                        React.createElement("thead", null,
                            React.createElement("tr", { className: "border-b bg-muted/40" },
                                React.createElement("th", { className: "py-3 px-4 text-left font-semibold text-foreground" }, "Sale price"),
                                React.createElement("th", { className: "py-3 px-4 text-left font-semibold text-foreground" }, "Commission rate"),
                                React.createElement("th", { className: "hidden sm:table-cell py-3 px-4 text-left font-semibold text-foreground" }, "Example"))),
                        React.createElement("tbody", { className: "divide-y" }, BRACKETS.map(function (b, i) { return (React.createElement("tr", { key: i, className: "hover:bg-muted/20 transition-colors" },
                            React.createElement("td", { className: "py-3.5 px-4 font-medium" }, b.range),
                            React.createElement("td", { className: "py-3.5 px-4" },
                                React.createElement("span", { className: "inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary" }, b.rate)),
                            React.createElement("td", { className: "hidden sm:table-cell py-3.5 px-4 text-muted-foreground" }, b.example))); })))),
                React.createElement("div", { className: "mt-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4" },
                    React.createElement("p", { className: "text-sm font-semibold text-foreground" }, "Example: two sales in the same month"),
                    React.createElement("p", { className: "mt-1.5 text-sm text-muted-foreground leading-6" },
                        "A ",
                        React.createElement("strong", { className: "text-foreground" }, "R500 sale"),
                        " (bracket 1) pays ",
                        React.createElement("strong", { className: "text-foreground" }, "R37.50"),
                        " ",
                        "commission. A",
                        " ",
                        React.createElement("strong", { className: "text-foreground" }, "R23,000 sale"),
                        " (bracket 4) pays ",
                        React.createElement("strong", { className: "text-foreground" }, "R2,300"),
                        ". These are two separate calculations. The R23,000 job does not change what you paid on the R500 job.")))),
        React.createElement("section", { id: "calculator", className: "mx-auto max-w-5xl px-4 py-16" },
            React.createElement("div", { className: "max-w-2xl mb-8" },
                React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "Commission calculator"),
                React.createElement("h2", { className: "mt-2 text-2xl font-bold tracking-tight" }, "See exactly what you'll pay"),
                React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" }, "Enter any sale price to see your commission and take-home. Switch on a ceiling package to see the difference \u2014 including how much each package saves you at that specific price.")),
            React.createElement(CommissionCalculator_1.CommissionCalculator, null)),
        React.createElement("section", { className: "border-y bg-muted/20" },
            React.createElement("div", { className: "mx-auto max-w-5xl px-4 py-16" },
                React.createElement("div", { className: "max-w-2xl" },
                    React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "For ceiling package holders"),
                    React.createElement("h2", { className: "mt-2 text-2xl font-bold tracking-tight" }, "Discount-unlock bonus"),
                    React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" },
                        "Providers on a ceiling package can earn an additional rate reduction by giving customers a",
                        " ",
                        React.createElement("strong", { className: "text-foreground" }, "genuine 10% discount"),
                        " ",
                        "on a service. The discount must be exactly 10% and the bonus requires a genuine sales history at the service's current price \u2014 rewarding real promotions, not artificially inflated list prices.")),
                React.createElement("div", { className: "mt-8 overflow-hidden rounded-2xl border" },
                    React.createElement("table", { className: "w-full text-sm" },
                        React.createElement("thead", null,
                            React.createElement("tr", { className: "border-b bg-muted/40" },
                                React.createElement("th", { className: "py-3 px-4 text-left font-semibold text-foreground" }, "Package"),
                                React.createElement("th", { className: "py-3 px-4 text-left font-semibold text-foreground" }, "Ceiling rate"),
                                React.createElement("th", { className: "py-3 px-4 text-left font-semibold text-foreground" }, "Discount bonus"),
                                React.createElement("th", { className: "py-3 px-4 text-left font-semibold text-foreground" }, "Rate unlocked"))),
                        React.createElement("tbody", { className: "divide-y" }, BONUS_TABLE.map(function (row, i) { return (React.createElement("tr", { key: i, className: "hover:bg-muted/20 transition-colors" },
                            React.createElement("td", { className: "py-3.5 px-4 font-medium text-foreground" }, row.package),
                            React.createElement("td", { className: "py-3.5 px-4 text-muted-foreground" }, row.ceiling),
                            React.createElement("td", { className: "py-3.5 px-4 text-muted-foreground" }, row.bonus),
                            React.createElement("td", { className: "py-3.5 px-4" },
                                React.createElement("span", { className: "inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary" }, row.unlocked)))); })))),
                React.createElement("p", { className: "mt-2 text-xs text-muted-foreground" }, "* The 4% stacking floor applies. The raw \u22124.5 pt reduction on the 7.5% ceiling would produce 3.0%, but the effective rate is clamped to a minimum of 4%."),
                React.createElement("div", { className: "mt-6 rounded-xl border border-primary-accent/30 bg-primary-accent/5 px-5 py-4" },
                    React.createElement("p", { className: "text-sm font-semibold text-foreground" }, "Worked example (9.5% ceiling)"),
                    React.createElement("p", { className: "mt-1.5 text-sm text-muted-foreground leading-6" },
                        "A provider on the 9.5% ceiling (R799/mo) lists a service at",
                        " ",
                        React.createElement("strong", { className: "text-foreground" }, "R6,300"),
                        ". They offer a",
                        " ",
                        React.createElement("strong", { className: "text-foreground" }, "10% discount"),
                        ", so the customer pays ",
                        React.createElement("strong", { className: "text-foreground" }, "R5,670"),
                        ". Without the bonus, commission is",
                        " ",
                        React.createElement("strong", { className: "text-foreground" }, "R538.65"),
                        " (9.5% of R5,670). With the 3.0 pt bonus unlocked, the effective rate drops to ",
                        React.createElement("strong", { className: "text-foreground" }, "6.5%"),
                        " \u2014 commission becomes ",
                        React.createElement("strong", { className: "text-foreground" }, "R368.55"),
                        ". That is ",
                        React.createElement("strong", { className: "text-foreground" }, "R170.10"),
                        " saved on a single job.")),
                React.createElement("p", { className: "mt-4 text-sm text-muted-foreground" }, "The bonus is opt-in \u2014 it is never applied silently. Once both conditions are met, your provider dashboard will prompt you to activate it per service."))),
        React.createElement("section", { className: "mx-auto max-w-5xl px-4 py-16" },
            React.createElement("div", { className: "max-w-3xl" },
                React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "Fair to everyone"),
                React.createElement("h2", { className: "mt-2 text-2xl font-bold tracking-tight" }, "We keep pricing trustworthy"),
                React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" }, "ServicePros monitors significant, sudden price changes to keep the marketplace trustworthy for customers. If you are raising prices because demand for your service is genuinely high, that is recognized \u2014 not penalized."),
                React.createElement("p", { className: "mt-3 text-muted-foreground leading-7" }, "Modest, gradual increases go live immediately. Larger increases may trigger a brief review or a support conversation \u2014 not to block you from adjusting your rates, but to make sure the price customers see in search results reflects reality."),
                React.createElement("div", { className: "mt-6 grid sm:grid-cols-3 gap-4" }, [
                    {
                        label: "Gradual increases",
                        body: "Go live immediately, no review needed."
                    },
                    {
                        label: "High-demand pricing",
                        body: "Recognized and handled fairly — real demand is never penalised."
                    },
                    {
                        label: "Price accuracy",
                        body: "Customers see what you actually charge — builds trust that converts."
                    },
                ].map(function (item) { return (React.createElement("div", { key: item.label, className: "rounded-xl border bg-card p-4" },
                    React.createElement("p", { className: "text-base font-semibold text-foreground" }, item.label),
                    React.createElement("p", { className: "mt-1 text-sm text-muted-foreground leading-5" }, item.body))); })))),
        React.createElement("section", { className: "border-t bg-muted/20" },
            React.createElement("div", { className: "mx-auto max-w-5xl px-4 py-16" },
                React.createElement("div", { className: "max-w-2xl mb-8" },
                    React.createElement("p", { className: "text-sm font-semibold uppercase tracking-wide text-primary-accent" }, "Common questions"),
                    React.createElement("h2", { className: "mt-2 text-2xl font-bold tracking-tight" }, "Pricing FAQ")),
                React.createElement("div", { className: "max-w-3xl space-y-0 divide-y rounded-2xl border overflow-hidden" }, FAQS.map(function (faq, i) { return (React.createElement(FaqItem, { key: i, q: faq.q, a: faq.a })); })),
                React.createElement("div", { className: "mt-8 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-5 py-4 max-w-3xl" },
                    React.createElement("p", { className: "text-sm font-semibold text-amber-900 dark:text-amber-300" }, "Policies still being finalised"),
                    React.createElement("ul", { className: "mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-400 list-disc list-inside" },
                        React.createElement("li", null,
                            React.createElement("strong", null, "Business Rescue & Business Management Support:"),
                            " ",
                            "both perks are confirmed as package benefits but their concrete scope and delivery are not yet defined. Details will be published before ceiling packages are bookable."),
                        React.createElement("li", null,
                            React.createElement("strong", null, "Partner coupons"),
                            " (Graphic Design, Social Content): the grant mechanism is built but the partner integrations are incoming \u2014 coupons will activate once the partner system is live."),
                        React.createElement("li", null,
                            React.createElement("strong", null, "Ceiling package cancellation:"),
                            " notice period, refund terms, and mid-cycle handling \u2014 not yet decided. Will be published before packages are bookable."),
                        React.createElement("li", null,
                            React.createElement("strong", null, "Free trial / first R99 charge:"),
                            " grace period policy not yet confirmed. Will be shown clearly during sign-up."))))),
        React.createElement("section", { className: "border-t bg-primary text-primary-foreground" },
            React.createElement("div", { className: "mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between" },
                React.createElement("div", null,
                    React.createElement("h2", { className: "text-2xl font-bold tracking-tight" }, "Ready to get listed?"),
                    React.createElement("p", { className: "mt-2 max-w-xl text-primary-foreground/80" }, "R99/month, commission only when you earn, no lock-in beyond the subscription.")),
                React.createElement(link_1["default"], { href: "/provider-signup", className: "inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90" },
                    "Create your profile",
                    React.createElement(Icon_1.Icon.arrowRight, { className: "h-4 w-4", weight: "bold" }))))));
}
exports["default"] = PricingPage;
// ─── Perk status icon ─────────────────────────────────────────────────────────
function PerkIcon(_a) {
    var status = _a.status;
    if (status === "included") {
        return (React.createElement("svg", { className: "shrink-0 mt-0.5 h-3.5 w-3.5 text-primary-accent", viewBox: "0 0 14 14", fill: "none" },
            React.createElement("circle", { cx: "7", cy: "7", r: "6.5", fill: "currentColor", fillOpacity: "0.15", stroke: "currentColor", strokeWidth: "1" }),
            React.createElement("path", { d: "M4 7l2 2 4-4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })));
    }
    if (status === "coming-soon") {
        return (React.createElement("svg", { className: "shrink-0 mt-0.5 h-3.5 w-3.5 text-muted-foreground", viewBox: "0 0 14 14", fill: "none" },
            React.createElement("circle", { cx: "7", cy: "7", r: "6.5", stroke: "currentColor", strokeWidth: "1", strokeDasharray: "2 2" }),
            React.createElement("path", { d: "M7 4.5v3l1.5 1.5", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })));
    }
    return (React.createElement("svg", { className: "shrink-0 mt-0.5 h-3.5 w-3.5 text-muted-foreground/40", viewBox: "0 0 14 14", fill: "none" },
        React.createElement("circle", { cx: "7", cy: "7", r: "6.5", stroke: "currentColor", strokeWidth: "1" }),
        React.createElement("path", { d: "M4.5 9.5l5-5M9.5 9.5l-5-5", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })));
}
// ─── FAQ accordion item (pure CSS, no JS) ────────────────────────────────────
function FaqItem(_a) {
    var q = _a.q, a = _a.a;
    return (React.createElement("details", { className: "group bg-card" },
        React.createElement("summary", { className: "flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-foreground select-none list-none hover:bg-muted/30 transition-colors" },
            q,
            React.createElement("span", { className: "shrink-0 transition-transform duration-200 group-open:rotate-45 text-muted-foreground" },
                React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none" },
                    React.createElement("path", { d: "M7 1v12M1 7h12", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round" })))),
        React.createElement("p", { className: "px-5 pb-5 text-sm leading-7 text-muted-foreground" }, a)));
}
