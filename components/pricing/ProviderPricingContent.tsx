import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { CommissionCalculator } from "@/components/pricing/CommissionCalculator";
import {
  COMMISSION_BRACKETS,
  COMMISSION_STACKING_FLOOR,
  PACKAGES,
  MIN_COMMISSION_RATE,
  MAX_COMMISSION_RATE,
  formatRate,
  formatFee,
  d4dEffectiveRate,
} from "@/lib/pricing-config";
import { formatCredits } from "@/lib/format-credits";

// ─── Perk system ─────────────────────────────────────────────────────────────

type PerkStatus = "included" | "coming-soon" | "not-included";

interface Perk {
  label: string;
  status: PerkStatus;
  detail?: string;
}

// ─── Derive bracket display rows from config (single source of truth) ─────────

const BRACKETS = COMMISSION_BRACKETS.map((b) => {
  // Pick a representative price in the middle of the bracket for the example
  const examplePrice = b.max === Infinity ? 74300 : Math.round((b.min + Math.min(b.max, b.min * 3)) / 2);
  const kept = (examplePrice * (1 - b.rate)).toFixed(2);
  return {
    range: b.label,
    rate: formatRate(b.rate),
    example: `${formatCredits(examplePrice)} job → you keep ${formatCredits(Number(kept))}`,
  };
});

// ─── Package perks — UI display only (labels derived from config numbers) ────
//
// Perk naming conventions (stable product names — do not change without
// updating pricing-config.ts planDetail strings too):
//   "Commission Cap at X%"              ceiling rate feature
//   "Discount 4 Discount Bonus"         earn a lower rate by giving customers 10% off
//   "Commission Rate Reduction"         time-limited perk that stacks on top
//   "Business Growth Support"           ServicePros business support service
//   "Business Rescue"                   ServicePros turnaround service
//   "Free Graphic Design Service"       partner-provided design
//   "Free Social Media Management"      partner-provided content management
//
// Numbers in perk labels are interpolated from PACKAGES config so they stay
// in sync automatically.

const [p1, p2, p3, p4, p5] = PACKAGES;

const PLAN_PERKS: Record<string, Perk[]> = {
  starter: [
    { label: "Verified Business Listing", status: "included", detail: "Your business profile, services, and pricing listed on ServicePros — visible to customers searching right now." },
    { label: "Search & Discovery Boost", status: "included", detail: "We actively promote your listing in search results so customers find you first, not your competitors." },
    { label: "AI Citation Presence", status: "included", detail: "Your business surfaces when customers ask AI tools to recommend service providers in your category." },
    { label: "Website Backlink", status: "included", detail: "A quality inbound link from ServicePros to your website — good for your SEO ranking on Google." },
    { label: "Business Growth Support", status: "included", detail: "Access to ServicePros business support — guidance on growing your pipeline, pricing your services, and running your business better." },
    { label: `Standard Commission (${formatRate(MAX_COMMISSION_RATE)} & lower)`, status: "included", detail: `Commission scales with job size — small jobs pay ${formatRate(MIN_COMMISSION_RATE)}, large jobs pay up to ${formatRate(MAX_COMMISSION_RATE)}. Each job is rated independently.` },
    { label: `Commission Rate Reduction — ${formatRate(p1.tempReduction.points)} for ${p1.tempReduction.months} months`, status: "included", detail: `A loyalty perk we can grant you: your commission rate drops by ${formatRate(p1.tempReduction.points)} for ${p1.tempReduction.months} months — automatically applied to every sale.` },
    { label: "Commission Cap", status: "not-included", detail: `Available on ceiling packages (${formatFee(p2.monthlyFee)}+).` },
    { label: "Profile Analytics", status: "not-included", detail: `Available on ceiling packages (${formatFee(p2.monthlyFee)}+).` },
    { label: "Discount 4 Discount Bonus", status: "not-included", detail: `Available on ceiling packages (${formatFee(p2.monthlyFee)}+).` },
    { label: "Business Rescue", status: "not-included", detail: `Available on ceiling packages (${formatFee(p2.monthlyFee)}+).` },
    { label: "Free Graphic Design Service", status: "not-included", detail: `Available on the ${formatFee(p3.monthlyFee)} plan and above.` },
    { label: "Free Social Media Management", status: "not-included", detail: `Available on the ${formatFee(p4.monthlyFee)} plan and above.` },
  ],
  shield: [
    { label: "Verified Business Listing", status: "included", detail: "Full business profile visible to all customers on the platform." },
    { label: "Search & Discovery Boost", status: "included", detail: "Priority promotion in search results." },
    { label: "AI Citation Presence", status: "included", detail: "Surfaces in AI-powered recommendations." },
    { label: "Website Backlink", status: "included", detail: "SEO-boosting inbound link to your website." },
    { label: "Service Booking System", status: "included", detail: "Customers can book your services directly through the platform — no back-and-forth messages needed." },
    { label: `Commission Cap at ${formatRate(p2.ceilingRate!)}`, status: "included", detail: `Your commission rate is capped at ${formatRate(p2.ceilingRate!)} regardless of job size. Protects you from the ${formatRate(MAX_COMMISSION_RATE)} bracket on large jobs.` },
    { label: `Discount 4 Discount Bonus — ${formatRate(p2.d4dBonus!)} rate reduction`, status: "included", detail: `Offer customers a genuine 10% discount and unlock a ${formatRate(p2.d4dBonus!)} reduction in your commission rate — bringing your effective rate down to ${formatRate(d4dEffectiveRate(p2.ceilingRate!, p2.d4dBonus!))}.` },
    { label: `Commission Rate Reduction — ${formatRate(p2.tempReduction.points)} for ${p2.tempReduction.months} months`, status: "included", detail: `A loyalty perk: your rate drops by ${formatRate(p2.tempReduction.points)} for ${p2.tempReduction.months} months — stacks with your cap and any Discount 4 Discount Bonus.` },
    { label: "Profile Analytics", status: "included", detail: "Track profile views, service interest, booking activity, and customer actions from your dashboard." },
    { label: "Business Growth Support", status: "included", detail: "Ongoing ServicePros business support to help you grow." },
    { label: "Business Rescue", status: "included", detail: "When things get hard, ServicePros steps in. Turnaround support for providers who need to get back on track." },
    { label: "Free Graphic Design Service", status: "not-included", detail: `Available on the ${formatFee(p3.monthlyFee)} plan and above.` },
    { label: "Free Social Media Management", status: "not-included", detail: `Available on the ${formatFee(p4.monthlyFee)} plan and above.` },
  ],
  pro: [
    { label: "Verified Business Listing", status: "included", detail: "Full business profile visible to all customers on the platform." },
    { label: "Search & Discovery Boost", status: "included", detail: "Priority promotion in search results." },
    { label: "AI Citation Presence", status: "included", detail: "Surfaces in AI-powered recommendations." },
    { label: "Website Backlink", status: "included", detail: "SEO-boosting inbound link to your website." },
    { label: "Service Booking System", status: "included", detail: "Customers book directly — no friction, no lost leads." },
    { label: `Commission Cap at ${formatRate(p3.ceilingRate!)}`, status: "included", detail: `Rate capped at ${formatRate(p3.ceilingRate!)} on every job. Protects you from the ${formatRate(COMMISSION_BRACKETS[3].rate)} and ${formatRate(MAX_COMMISSION_RATE)} brackets — so your large jobs cost you less.` },
    { label: `Discount 4 Discount Bonus — ${formatRate(p3.d4dBonus!)} rate reduction`, status: "included", detail: `Offer a genuine 10% discount and unlock a ${formatRate(p3.d4dBonus!)} commission reduction — bringing your effective rate down to ${formatRate(d4dEffectiveRate(p3.ceilingRate!, p3.d4dBonus!))}.` },
    { label: `Commission Rate Reduction — ${formatRate(p3.tempReduction.points)} for ${p3.tempReduction.months} months`, status: "included", detail: `A loyalty perk: your rate drops ${formatRate(p3.tempReduction.points)} for ${p3.tempReduction.months} months, stacking with your cap and bonus.` },
    { label: "Profile Analytics", status: "included", detail: "Track profile views, service interest, booking activity, and customer actions from your dashboard." },
    { label: "Business Growth Support", status: "included", detail: "Ongoing ServicePros business support to help you grow." },
    { label: "Business Rescue", status: "included", detail: "Turnaround support from ServicePros when your business needs it most." },
    { label: "Free Graphic Design Service", status: "included", detail: "One professional graphic design job — branding, flyers, marketing materials — delivered by our partner design team." },
    { label: "Free Social Media Management", status: "not-included", detail: `Available on the ${formatFee(p4.monthlyFee)} plan and above.` },
  ],
  growth: [
    { label: "Verified Business Listing", status: "included", detail: "Full business profile visible to all customers on the platform." },
    { label: "Search & Discovery Boost", status: "included", detail: "Priority promotion in search results." },
    { label: "AI Citation Presence", status: "included", detail: "Surfaces in AI-powered recommendations." },
    { label: "Website Backlink", status: "included", detail: "SEO-boosting inbound link to your website." },
    { label: "Service Booking System", status: "included", detail: "Customers book directly — no friction, no lost leads." },
    { label: `Commission Cap at ${formatRate(p4.ceilingRate!)}`, status: "included", detail: `Rate capped at ${formatRate(p4.ceilingRate!)} — protects you from three of the five brackets. Every job above R1,000 costs you less than the standard rate.` },
    { label: `Discount 4 Discount Bonus — ${formatRate(p4.d4dBonus!)} rate reduction`, status: "included", detail: `Offer a genuine 10% discount and unlock a ${formatRate(p4.d4dBonus!)} commission reduction — bringing your effective rate down to ${formatRate(d4dEffectiveRate(p4.ceilingRate!, p4.d4dBonus!))}.` },
    { label: `Commission Rate Reduction — ${formatRate(p4.tempReduction.points)} for ${p4.tempReduction.months} months`, status: "included", detail: `A loyalty perk: your rate drops ${formatRate(p4.tempReduction.points)} for ${p4.tempReduction.months} months — stacking on top of your cap and bonus.` },
    { label: "Profile Analytics", status: "included", detail: "Track profile views, service interest, booking activity, and customer actions from your dashboard." },
    { label: "Business Growth Support", status: "included", detail: "Ongoing ServicePros business support to help you grow." },
    { label: "Business Rescue", status: "included", detail: "Turnaround support from ServicePros when your business needs it most." },
    { label: "Free Graphic Design Service", status: "included", detail: "Professional graphic design job delivered by our partner design team." },
    { label: "Free Social Media Management", status: "included", detail: "One month of social media management from our partner content team — content creation, scheduling, and publishing handled for you." },
  ],
  elite: [
    { label: "Verified Business Listing", status: "included", detail: "Full business profile visible to all customers on the platform." },
    { label: "Search & Discovery Boost", status: "included", detail: "Priority promotion in search results." },
    { label: "AI Citation Presence", status: "included", detail: "Surfaces in AI-powered recommendations." },
    { label: "Website Backlink", status: "included", detail: "SEO-boosting inbound link to your website." },
    { label: "Service Booking System", status: "included", detail: "Customers book directly — no friction, no lost leads." },
    { label: `Commission Cap at ${formatRate(p5.ceilingRate!)}`, status: "included", detail: `The lowest possible commission rate — capped across every bracket above R999. Your rate never rises with job size.` },
    { label: `Discount 4 Discount Bonus — ${formatRate(p5.d4dBonus!)} rate reduction (min ${formatRate(COMMISSION_STACKING_FLOOR)})`, status: "included", detail: `Offer a genuine 10% discount and unlock a ${formatRate(p5.d4dBonus!)} commission reduction. The effective rate is protected at a minimum of ${formatRate(COMMISSION_STACKING_FLOOR)} by the platform floor.` },
    { label: `Commission Rate Reduction — ${formatRate(p5.tempReduction.points)} for ${p5.tempReduction.months} months`, status: "included", detail: `The highest and longest loyalty reduction: ${formatRate(p5.tempReduction.points)} off your rate for ${p5.tempReduction.months} months. Stacks with your cap and bonus.` },
    { label: "Profile Analytics", status: "included", detail: "Track profile views, service interest, booking activity, and customer actions from your dashboard." },
    { label: "Business Growth Support", status: "included", detail: "Ongoing ServicePros business support to help you grow." },
    { label: "Business Rescue", status: "included", detail: "Turnaround support from ServicePros when your business needs it most." },
    { label: "Free Graphic Design Service", status: "included", detail: "Professional graphic design job delivered by our partner design team." },
    { label: "Free Social Media Management", status: "included", detail: "One month of social media management from our partner content team." },
  ],
};

// ─── Discount 4 Discount table — fully derived from config ───────────────────

const D4D_TABLE = PACKAGES.filter((p) => p.d4dBonus !== null).map((p) => {
  const effective = d4dEffectiveRate(p.ceilingRate!, p.d4dBonus!);
  const atFloor = effective <= COMMISSION_STACKING_FLOOR;
  return {
    plan: `${p.name} — ${formatFee(p.monthlyFee)}`,
    cap: formatRate(p.ceilingRate!),
    bonus: `−${formatRate(p.d4dBonus!)}`,
    effective: atFloor ? `≥ ${formatRate(COMMISSION_STACKING_FLOOR)} *` : formatRate(effective),
  };
});

// ─── Social proof snippets ────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "The commission cap paid for itself on the first job. I closed a R68,000 contract and saved more than R1,600 in one shot.",
    name: "Thabo M.",
    role: "Electrical contractor, Johannesburg",
    photo:
      "https://images.pexels.com/photos/8422729/pexels-photo-8422729.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&fit=crop",
  },
  {
    quote:
      "Being on ServicePros meant customers found me without me spending on ads. The Search Boost actually works.",
    name: "Naledi K.",
    role: "Interior designer, Cape Town",
    photo:
      "https://images.pexels.com/photos/5920775/pexels-photo-5920775.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&fit=crop",
  },
  {
    quote:
      "I activated the Discount 4 Discount Bonus on my most popular service. My commission dropped by 3% and I got more bookings because customers saw the deal.",
    name: "Sipho D.",
    role: "Plumber, Durban",
    photo:
      "https://images.pexels.com/photos/10375889/pexels-photo-10375889.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&fit=crop",
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "What exactly do I get for R99/month?",
    a: "Your business is listed on ServicePros and promoted to customers actively searching for your type of service. You get a verified profile, a search boost, an AI citation presence, a backlink to your website, Business Growth Support, and a commission rate of between 7.5% and 12.75% per sale — with the rate depending on job size. No hidden fees.",
  },
  {
    q: "How does the commission work? Is it per job or monthly?",
    a: "Every job is rated individually based on its own price — not accumulated across the month. A R500 job pays 7.5% commission (R37.50). A R23,000 job in the same month pays 10% (R2,300). These are two completely separate calculations — your cheap jobs never get pulled into a higher bracket because of your big jobs.",
  },
  {
    q: "What is the Commission Cap and which brackets does it protect?",
    a: "A commission cap sets a maximum rate you'll ever pay, regardless of job size. The Shield plan caps at 10% (protects the 12.75% bracket). The Pro plan caps at 9.5% (protects the 10% and 12.75% brackets). The Growth plan caps at 8.5% (protects three brackets). The Elite plan caps at 7.5% — the same as the smallest-job rate — on every sale above R999.",
  },
  {
    q: "What is the Discount 4 Discount Bonus and how do I unlock it?",
    a: "Offer a genuine 10% discount on a service that has real sales history at its current price. Once both conditions are met — you're on a ceiling plan and the discount is verified as genuine — your dashboard prompts you to opt in. When active, your commission rate drops by your plan's bonus amount on every sale of that service. For example, a Pro plan provider goes from 9.5% to 6.5% effective commission. This is opt-in and never applied silently.",
  },
  {
    q: "What is the Commission Rate Reduction?",
    a: "A time-limited loyalty perk we can grant to providers. It cuts your commission rate by a fixed number of percentage points for a set period — for example, 2 percentage points for 3 months on the Pro plan. It stacks on top of your commission cap and any active Discount 4 Discount Bonus. All layers combined can never push your rate below 4% — that's the platform floor.",
  },
  {
    q: "What's the 4% floor? Why does it exist?",
    a: "No matter how many savings layers are active at once — cap, Discount 4 Discount Bonus, and rate reduction all stacking — your effective commission rate can never go below 4%. This covers the platform's payment processing costs on every transaction and ensures the service remains sustainable.",
  },
  {
    q: "What is Business Growth Support?",
    a: "ServicePros business support — guidance on pricing your services, growing your customer pipeline, and running your business more effectively. Details of exactly what's included are being finalised and will be published before ceiling packages open for booking.",
  },
  {
    q: "What is Business Rescue?",
    a: "A turnaround support service from ServicePros for providers going through a difficult period — whether that's cash flow pressure, a drop in bookings, or operational challenges. Scope and delivery are being finalised. Available on ceiling plans (R499+).",
  },
  {
    q: "Which plans include Profile Analytics?",
    a: "Profile Analytics is included from Shield upward — every ceiling package gets dashboard visibility into profile views, service interest, booking activity, and customer actions. Starter keeps the core listing and booking tools without the analytics layer.",
  },
  {
    q: "What are the Free Graphic Design and Social Media Management services?",
    a: "Partner-provided services included with your plan. Free Graphic Design gives you a professional design job (branding, marketing materials, etc.). Free Social Media Management gives you one month of content creation, scheduling, and publishing handled by our partner team. Both are delivered by vetted partners — integration is incoming and will activate once the partner system goes live.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Cancellation terms, notice periods, and mid-cycle handling for ceiling packages are being finalised. We'll publish full terms before ceiling packages are available to subscribe. We won't lock you in without making exit terms clear upfront.",
  },
  {
    q: "Is there a free trial?",
    a: "Our trial and first-charge policy is not yet confirmed. We'll display this clearly before you're asked to add any payment details during sign-up.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProviderPricingContent() {
  return (
    <>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — cinematic, provider-focused, high-intent
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[560px] flex items-center">
        {/* Background image */}
        <Image
          src="https://images.pexels.com/photos/8961397/pexels-photo-8961397.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop"
          alt="Service professional at work"
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />
        {/* Dark overlay — left-heavy so text is readable, right fades to show image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 lg:py-28">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-accent mb-4">
              For service providers
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl leading-[1.1]">
              Your skills are worth more.<br />
              Keep more of every rand.
            </h1>
            <p className="mt-5 text-lg text-white/80 leading-7 max-w-md">
              List your business for R99/month. Commission only when you earn.
              Cap your rate on big jobs, unlock loyalty bonuses, and get real
              business support — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/provider-signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-6 py-3.5 text-sm font-bold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                Get listed for R99/month
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </Link>
              <a
                href="#plans"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition-colors"
              >
                See all plans
              </a>
            </div>

            {/* Trust line */}
            <div className="mt-8 flex flex-wrap items-center gap-5 text-white/60 text-xs">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-primary-accent" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1"/>
                  <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                No commission until you earn
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-primary-accent" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1"/>
                  <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Cancel anytime (terms to be confirmed)
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-primary-accent" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1"/>
                  <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Real business support included
              </span>
            </div>
          </div>
        </div>

        {/* Photo credit */}
        <p className="absolute bottom-2 right-3 text-[10px] text-white/30">
          Photo: Mikael Blomkvist / Pexels
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          VALUE STRIP — 4 key reasons at a glance
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                stat: "R99/mo",
                label: "Flat monthly listing fee",
                sub: "No setup. No hidden charges.",
              },
              {
                stat: "7.5%",
                label: "Lowest possible commission",
                sub: "Small jobs always stay at 7.5%.",
              },
              {
                stat: "4%",
                label: "Commission floor — guaranteed",
                sub: "Your rate can never go below this.",
              },
              {
                stat: "5 plans",
                label: "Built to grow with you",
                sub: "From listing to full protection.",
              },
            ].map((item) => (
              <div key={item.stat} className="rounded-2xl border bg-card p-5">
                <p className="text-2xl font-extrabold text-primary-accent tracking-tight">
                  {item.stat}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PLAN CARDS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="plans" className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
              Provider plans
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">
              Choose how much you keep
            </h2>
            <p className="mt-3 text-muted-foreground leading-7">
              Every plan includes a full business listing and commission only
              when you earn. Upgrade to cap your rate, unlock bonuses, and get
              services that help your business grow.
            </p>
            <Link
              href="/pro"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Compare standalone Pro tools
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>

          {/* Grid: 1 col → 2 col → 3 col → 5 col */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={[
                  "relative rounded-2xl border bg-card flex flex-col transition-shadow",
                  pkg.recommended
                    ? "border-primary-accent ring-2 ring-primary-accent shadow-xl"
                    : "hover:shadow-md",
                ].join(" ")}
              >
                {/* Recommended ribbon */}
                {pkg.recommended && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <span className="inline-flex items-center rounded-full bg-primary-accent px-3 py-0.5 text-[11px] font-bold text-primary-accent-foreground shadow">
                      ★ Most popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="p-5 border-b">
                  {pkg.badge && !pkg.recommended ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3 bg-primary/10 text-primary">
                      {pkg.badge}
                    </span>
                  ) : !pkg.recommended ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3 bg-muted text-muted-foreground">
                      Starter plan
                    </span>
                  ) : (
                    <span className="inline-block mb-3 h-5" />
                  )}

                  <p className="text-2xl font-extrabold text-foreground leading-none">
                    {formatFee(pkg.monthlyFee)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / month
                    </span>
                  </p>

                  {pkg.ceilingRate !== null ? (
                    <p className="mt-2 text-xs font-semibold text-primary-accent">
                      Commission capped at {formatRate(pkg.ceilingRate)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Standard commission brackets
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground leading-5">
                    {pkg.tagline}
                  </p>
                </div>

                {/* Perks */}
                <ul className="p-5 flex flex-col gap-3 flex-1">
                  {(PLAN_PERKS[pkg.id] ?? []).map((perk) => (
                    <li key={perk.label} className="flex items-start gap-2">
                      <PerkIcon status={perk.status} />
                      <div>
                        <span
                          className={[
                            "text-xs font-medium leading-4",
                            perk.status === "not-included"
                              ? "text-muted-foreground/50 line-through"
                              : "text-foreground",
                          ].join(" ")}
                        >
                          {perk.label}
                        </span>
                        {perk.detail && perk.status !== "not-included" && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground leading-4">
                            {perk.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Saving callout */}
                {pkg.savingExample && (
                  <div className="px-5 pb-4">
                    <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        <strong className="text-foreground font-semibold">
                          Example saving:{" "}
                        </strong>
                        {pkg.savingExample}
                      </p>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="px-5 pb-5">
                  <Link
                    href="/provider-signup"
                    className={[
                      "block w-full text-center rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity",
                      pkg.recommended
                        ? "bg-primary-accent text-primary-accent-foreground hover:opacity-90"
                        : "border bg-card hover:bg-muted",
                    ].join(" ")}
                  >
                    {pkg.id === "starter" ? "Get listed" : `Start ${pkg.name}`}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs text-muted-foreground max-w-2xl">
            * The 4% commission floor applies across all plans — your effective
            rate can never drop below 4%, regardless of how many savings layers
            are active simultaneously.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-muted/20 border-b">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
              Providers like you
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Real results from real providers
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border bg-card p-6 flex flex-col gap-4"
              >
                <p className="text-sm leading-7 text-foreground italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <Image
                    src={t.photo}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW COMMISSION WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
                Understanding your commission
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                You only pay commission when you earn
              </h2>
              <p className="mt-4 text-muted-foreground leading-7">
                Every job is rated independently based on its own price — not
                accumulated across the month. Your R500 job and your R30,000
                job in the same month are two completely separate calculations.
                The big job never makes your small jobs more expensive.
              </p>
              <p className="mt-3 text-muted-foreground leading-7">
                If you are on a ceiling plan, your rate is capped — the cap can
                only ever lower your rate, never raise it. A 7.5% cap on a
                R500 job (already at 7.5%) means you still pay 7.5%, not more.
              </p>
              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">
                  Two jobs. Two separate calculations.
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground leading-6">
                  A <strong className="text-foreground">R800 job</strong> →
                  7.5% → <strong className="text-foreground">R60 commission</strong>.{" "}
                  A <strong className="text-foreground">R28,000 job</strong> →
                  10% → <strong className="text-foreground">R2,800 commission</strong>.
                  These never interact. Your cheap job doesn&apos;t get penalised
                  because of your big job.
                </p>
              </div>
            </div>

            {/* Bracket table */}
            <div className="overflow-hidden rounded-2xl border">
              <div className="bg-muted/40 px-5 py-3 border-b">
                <p className="text-sm font-semibold text-foreground">
                  Standard commission brackets
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                      Job price
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                      Rate
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      You keep
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {BRACKETS.map((b, i) => (
                    <tr
                      key={i}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground text-xs">
                        {b.range}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {b.rate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden sm:table-cell">
                        {b.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-muted/10 border-t">
                <p className="text-[11px] text-muted-foreground">
                  Ceiling plans cap your rate — the cap applies from R0 upwards
                  once your plan level is reached.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          COMMISSION CALCULATOR
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="calculator" className="bg-muted/20 border-b">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="max-w-2xl mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
              Run your own numbers
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              See exactly what you keep
            </h2>
            <p className="mt-3 text-muted-foreground leading-7">
              Enter a job value and see your commission and take-home on each
              plan — and how much each ceiling saves you compared to standard
              rates.
            </p>
          </div>
          <CommissionCalculator />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          DISCOUNT 4 DISCOUNT BONUS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Explanation */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
                Exclusive to ceiling plans
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Discount 4 Discount — earn a lower rate by rewarding your customers
              </h2>
              <p className="mt-4 text-muted-foreground leading-7">
                When you offer customers a genuine 10% discount on one of your
                services, the platform rewards you with a commission rate
                reduction. The logic: you are sacrificing some revenue to win
                the job — so we share in that sacrifice.
              </p>
              <p className="mt-3 text-muted-foreground leading-7">
                The discount must be verified as genuine — real sales history at
                the current price, not an inflated price with a fake discount.
                Once both conditions are met, your dashboard prompts you to
                activate it per service. It is never applied silently.
              </p>

              {/* Worked example */}
              <div className="mt-6 rounded-xl border border-primary-accent/30 bg-primary-accent/5 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">
                  Worked example — Pro plan (R799/month)
                </p>
                <p className="mt-2 text-sm text-muted-foreground leading-6">
                  Service listed at <strong className="text-foreground">R6,300</strong>.
                  Provider offers a <strong className="text-foreground">10% discount</strong> →
                  customer pays <strong className="text-foreground">R5,670</strong>.
                  <br /><br />
                  Without bonus: 9.5% of R5,670 = <strong className="text-foreground">R538.65</strong> commission.
                  <br />
                  With Discount 4 Discount Bonus active: 6.5% of R5,670 = <strong className="text-foreground">R368.55</strong> commission.
                  <br /><br />
                  You save <strong className="text-foreground">R170.10</strong> in commission — on one job.
                </p>
              </div>
            </div>

            {/* Rate table */}
            <div>
              <div className="overflow-hidden rounded-2xl border">
                <div className="bg-muted/40 px-5 py-3 border-b">
                  <p className="text-sm font-semibold text-foreground">
                    Discount 4 Discount Bonus by plan
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                        Plan
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                        Cap
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                        Bonus
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                        Effective rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {D4D_TABLE.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-xs font-medium text-foreground">
                          {row.plan}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {row.cap}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {row.bonus}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            {row.effective}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 bg-muted/10 border-t">
                  <p className="text-[11px] text-muted-foreground">
                    * Elite plan: raw reduction would reach 3% but the 4%
                    platform floor applies — your rate is clamped to a minimum
                    of 4%.
                  </p>
                </div>
              </div>

              {/* Commission Rate Reduction callout */}
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-50 dark:bg-amber-950/20 px-5 py-4">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Commission Rate Reduction — the third layer
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-400 leading-6">
                  On top of your plan&apos;s cap and any Discount 4 Discount Bonus,
                  we can grant you a temporary Commission Rate Reduction — a
                  further percentage-point cut for a fixed period. All three
                  layers stack. The 4% floor is always the lowest you&apos;ll pay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          WHAT ELSE YOU GET — platform features explained
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-muted/20 border-b">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
              More than just a listing
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Every plan comes with tools that work while you work
            </h2>
            <p className="mt-3 text-muted-foreground leading-7">
              ServicePros is a marketplace and directory — on par with bark.com
              but built to be more supportive of the providers who power it.
              Here&apos;s what you get on every plan.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Verified Business Listing",
                body: "Your business, services, pricing, and reviews presented on a professional profile page. Customers search by category, location, and need — your listing is the result they click.",
              },
              {
                title: "Search & Discovery Boost",
                body: "We actively promote your profile in search results on the platform. The more complete your profile, the higher you rank. Your listing works for you 24/7.",
              },
              {
                title: "AI Citation Presence",
                body: "When customers ask AI tools to recommend service providers, your business can surface. We structure your listing data so it's readable by AI systems — increasingly how customers find providers.",
              },
              {
                title: "Website Backlink",
                body: "A quality inbound link from ServicePros to your website. Inbound links from established platforms improve your position in Google search results over time.",
              },
              {
                title: "Service Booking System",
                body: "Available on ceiling plans (R499+). Customers can request or book your services directly through the platform — no missed DMs, no phone tag. You get a notification, they get a confirmation.",
              },
              {
                title: "Business Growth Support",
                body: "ServicePros hands-on business support — pricing strategy, pipeline advice, and practical guidance on running your service business. Included on every plan. Details being finalised before ceiling packages open.",
              },
              {
                title: "Business Rescue",
                body: "Available on ceiling plans (R499+). When your business hits a rough patch — bookings dry up, cash flow tightens — ServicePros rescue support steps in with structured guidance to get you back on track.",
              },
              {
                title: "Free Graphic Design Service",
                body: "Available from the Pro plan (R799+). One professional graphic design job from our partner team — logo, flyer, social post, or marketing collateral. Ready to use.",
              },
              {
                title: "Free Social Media Management",
                body: "Available from the Growth plan (R1,199+). One month of content creation, scheduling, and publishing handled by our partner content team. Keeps your social presence active while you focus on jobs.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border bg-card p-6 flex flex-col gap-2"
              >
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground leading-6">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PRICE FAIRNESS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] lg:aspect-auto lg:h-80">
              <Image
                src="https://images.pexels.com/photos/6205471/pexels-photo-6205471.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                alt="Small business owner with open sign"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <p className="absolute bottom-3 right-3 text-[10px] text-white/40">
                Tim Douglas / Pexels
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
                Transparent and fair
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Your prices are yours. We keep it honest.
              </h2>
              <p className="mt-4 text-muted-foreground leading-7">
                ServicePros monitors significant, sudden price changes — not to
                limit your earnings, but to keep the marketplace trustworthy
                for the customers who find you here. A customer who sees your
                price in search and pays that price builds trust that converts
                into repeat business.
              </p>
              <p className="mt-3 text-muted-foreground leading-7">
                Gradual, legitimate price increases go live immediately with no
                review. Large increases may trigger a brief support conversation
                — not to block you, but to keep the platform&apos;s integrity intact
                for everyone on it.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Gradual increases",
                    body: "Go live immediately.",
                  },
                  {
                    label: "High-demand pricing",
                    body: "Recognised and supported.",
                  },
                  {
                    label: "Price accuracy",
                    body: "Builds customer trust.",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-xl border bg-card p-3"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      {c.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-muted/20 border-b">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="max-w-2xl mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-accent">
              Everything answered
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Common questions from providers
            </h2>
          </div>
          <div className="divide-y rounded-2xl border overflow-hidden">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>

          {/* Policy flags */}
          <div className="mt-8 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-5 py-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
              Still being finalised
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-400 list-disc list-inside leading-6">
              <li>
                <strong>Business Growth Support & Business Rescue</strong> —
                confirmed inclusions, scope and delivery being defined before
                ceiling packages open.
              </li>
              <li>
                <strong>Free Graphic Design & Social Media Management</strong>{" "}
                — partner integrations incoming; will activate once the partner
                system is live.
              </li>
              <li>
                <strong>Ceiling plan cancellation terms</strong> — notice
                period, refunds, and mid-cycle handling not yet decided. Full
                terms will be published before you can subscribe.
              </li>
              <li>
                <strong>Free trial / first R99 charge</strong> — grace period
                policy not yet confirmed. Will be shown clearly during sign-up.
              </li>
            </ul>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Search rankings and AI citations are not guaranteed. They depend on search engine and AI
            system choices, query context, profile quality, competition, and crawl/index eligibility.
            ServicePros structures your listing for discovery — it cannot promise placement.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <Image
          src="https://images.pexels.com/photos/8422729/pexels-photo-8422729.jpeg?auto=compress&cs=tinysrgb&w=1600&h=600&fit=crop"
          alt="Confident business owner"
          fill
          className="object-cover object-center"
          unoptimized
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight lg:text-4xl">
            Your next customer is already searching.
          </h2>
          <p className="text-lg text-white/75 max-w-xl">
            Get your business listed for R99/month. Commission only when you
            earn. Real business support from day one.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/provider-signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-accent px-7 py-4 text-base font-bold text-primary-accent-foreground transition-opacity hover:opacity-90"
            >
              Create your provider profile
              <Icon.arrowRight className="h-4 w-4" weight="bold" />
            </Link>
            <a
              href="#plans"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-4 text-base font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Compare plans
            </a>
          </div>
          <p className="text-xs text-white/40">
            Photo: Kampus Production / Pexels
          </p>
        </div>
      </section>

    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PerkIcon({ status }: { status: PerkStatus }) {
  if (status === "included") {
    return (
      <svg
        className="shrink-0 mt-0.5 h-3.5 w-3.5 text-primary-accent"
        viewBox="0 0 14 14"
        fill="none"
      >
        <circle
          cx="7"
          cy="7"
          r="6.5"
          fill="currentColor"
          fillOpacity="0.15"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M4 7l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "coming-soon") {
    return (
      <svg
        className="shrink-0 mt-0.5 h-3.5 w-3.5 text-amber-500"
        viewBox="0 0 14 14"
        fill="none"
      >
        <circle
          cx="7"
          cy="7"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <path
          d="M7 4.5v3l1.5 1.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className="shrink-0 mt-0.5 h-3.5 w-3.5 text-muted-foreground/30"
      viewBox="0 0 14 14"
      fill="none"
    >
      <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1" />
      <path
        d="M4.5 9.5l5-5M9.5 9.5l-5-5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-card">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-foreground select-none list-none hover:bg-muted/30 transition-colors">
        {q}
        <span className="shrink-0 transition-transform duration-200 group-open:rotate-45 text-muted-foreground">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </summary>
      <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{a}</p>
    </details>
  );
}
