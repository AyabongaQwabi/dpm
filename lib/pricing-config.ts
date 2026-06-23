/**
 * SINGLE SOURCE OF TRUTH — provider pricing configuration.
 *
 * Every number that appears in:
 *   - The pricing page (display copy, saving callouts, plan cards)
 *   - The commission calculator (client-side math)
 *   - The domain layer (server-side calculations via platform_config DB rows)
 *   - Migrations (the INSERT values in supabase/migrations/)
 *   - Unit test fixtures
 *
 * …derives from this file. To change any rate, fee, or limit: change it here,
 * and it automatically flows everywhere.
 *
 * The database (platform_config table) remains the runtime source for server
 * calculations. This file generates the InMemoryConfigStore entries used in
 * tests, the DB seed values asserted in migrations, and the display values
 * used in UI components that can't call the DB directly (client components,
 * static sections of the pricing page, etc.).
 *
 * HOW IT WORKS IN PRACTICE
 * ─────────────────────────
 * 1. Server domain functions (payments.ts) read from ConfigStore (DB-backed).
 *    The DB values must match what's seeded in the migration.
 * 2. The migration INSERT is generated from PLATFORM_CONFIG_SEED below —
 *    so "update the migration" means "re-derive from this file."
 * 3. Client components (CommissionCalculator, pricing page) import the typed
 *    constants directly and use them for display and in-browser math.
 * 4. Test fixtures call makePricingConfigStore() which returns an
 *    InMemoryConfigStore pre-populated from this file.
 */

// ─── Commission brackets ──────────────────────────────────────────────────────

/**
 * The five per-sale commission brackets.
 * `max: Infinity` on the last bracket means "everything above the previous max".
 */
export const COMMISSION_BRACKETS = [
  { min: 0,     max: 999,      rate: 0.075,  label: 'R0 – R999' },
  { min: 1000,  max: 4999,     rate: 0.085,  label: 'R1,000 – R4,999' },
  { min: 5000,  max: 9999,     rate: 0.095,  label: 'R5,000 – R9,999' },
  { min: 10000, max: 49999,    rate: 0.10,   label: 'R10,000 – R49,999' },
  { min: 50000, max: Infinity, rate: 0.1275, label: 'R50,000+' },
] as const satisfies readonly CommissionBracketDef[];

export interface CommissionBracketDef {
  min: number;
  max: number;
  rate: number;
  label: string;
}

/** Lowest possible commission rate (bracket 1). Useful for display copy. */
export const MIN_COMMISSION_RATE = COMMISSION_BRACKETS[0].rate; // 0.075

/** Highest possible commission rate (bracket 5). Useful for display copy. */
export const MAX_COMMISSION_RATE = COMMISSION_BRACKETS[COMMISSION_BRACKETS.length - 1].rate; // 0.1275

// ─── Commission floor ─────────────────────────────────────────────────────────

/**
 * Stacking floor: the effective commission rate can never drop below this,
 * regardless of how many savings layers (ceiling + D4D bonus + temp reduction)
 * are active simultaneously.
 */
export const COMMISSION_STACKING_FLOOR = 0.04;

// ─── Packages ─────────────────────────────────────────────────────────────────

/**
 * Every provider plan. The `id` is the stable identifier used throughout the
 * codebase (package_number in the DB is 1–5 matching the array index + 1).
 *
 * Fields:
 *   packageNumber   — DB integer (1–5). Never reassign existing numbers.
 *   id              — Stable string key for code references.
 *   name            — Marketing display name.
 *   monthlyFee      — Subscription fee in Rands (integer).
 *   ceilingRate     — Max commission rate, or null for base plan (no cap).
 *   d4dBonus        — Discount 4 Discount bonus in rate-points (e.g. 0.025 = 2.5%).
 *                     null for base plan (bonus not available).
 *   tempReduction   — Time-limited rate reduction that can be granted as a perk.
 *   badge           — Card badge label, or null.
 *   recommended     — Whether this plan is highlighted as "most popular".
 *   tagline         — One-line selling tagline for the plan card.
 *   planDetail      — One-paragraph description used in the plan card body.
 *   savingExample   — Concrete saving example shown in the plan card callout,
 *                     or null for base plan. Derived dynamically where possible
 *                     but stored here so the pricing page stays static-renderable.
 */
export interface PackageConfig {
  packageNumber: 1 | 2 | 3 | 4 | 5;
  id: string;
  name: string;
  monthlyFee: number;
  ceilingRate: number | null;
  d4dBonus: number | null;
  tempReduction: {
    /** Rate-point reduction, e.g. 0.010 = 1.0 percentage point */
    points: number;
    /** Duration in calendar months */
    months: number;
  };
  badge: string | null;
  recommended: boolean;
  tagline: string;
  planDetail: string;
  savingExample: string | null;
}

export const PACKAGES: readonly PackageConfig[] = [
  {
    packageNumber: 1,
    id: 'starter',
    name: 'Starter',
    monthlyFee: 99,
    ceilingRate: null,
    d4dBonus: null,
    tempReduction: { points: 0.010, months: 3 },
    badge: null,
    recommended: false,
    tagline: 'Get your business in front of customers today.',
    planDetail:
      'Everything you need to start taking jobs through the platform. Pay a flat monthly fee and a small commission on what you earn — nothing more.',
    savingExample: null,
  },
  {
    packageNumber: 2,
    id: 'shield',
    name: 'Shield',
    monthlyFee: 499,
    ceilingRate: 0.10,
    d4dBonus: 0.025,
    tempReduction: { points: 0.016, months: 3 },
    badge: 'Entry protection',
    recommended: false,
    tagline: 'Stop overpaying on your biggest jobs.',
    planDetail:
      'Commission capped at 10% — so when you close a large job, you keep significantly more. One job can pay for this plan many times over.',
    savingExample:
      "On a R74,300 job: standard commission is R9,473. With your cap it's R7,430. You keep an extra R2,043 — from one job.",
  },
  {
    packageNumber: 3,
    id: 'pro',
    name: 'Pro',
    monthlyFee: 799,
    ceilingRate: 0.095,
    d4dBonus: 0.030,
    tempReduction: { points: 0.020, months: 3 },
    badge: 'Most popular',
    recommended: true,
    tagline: 'The plan serious providers choose.',
    planDetail:
      'A tighter commission cap plus a free Graphic Design service. One R10,000 job more than pays for the month.',
    savingExample:
      "On a R75,000 job: standard commission is R9,562. With your cap it's R7,125. You pocket R2,437 extra — more than 3× the monthly plan cost.",
  },
  {
    packageNumber: 4,
    id: 'growth',
    name: 'Growth',
    monthlyFee: 1199,
    ceilingRate: 0.085,
    d4dBonus: 0.035,
    tempReduction: { points: 0.030, months: 3 },
    badge: 'High-volume',
    recommended: false,
    tagline: 'Built for providers closing jobs above R1,000 every week.',
    planDetail:
      'The cap kicks in at the second bracket — almost every job you close is cheaper. Plus a free Social Media Management service to fuel your inbound pipeline.',
    savingExample:
      'Every job above R1,000 is capped. On 5 × R10,000 jobs: save R7,500 compared to standard rates — in a single month.',
  },
  {
    packageNumber: 5,
    id: 'elite',
    name: 'Elite',
    monthlyFee: 1699,
    ceilingRate: 0.075,
    d4dBonus: 0.045,
    tempReduction: { points: 0.035, months: 6 },
    badge: 'Max protection',
    recommended: false,
    tagline: 'The same rate on a R2,000 job as a R200,000 job.',
    planDetail:
      'Every sale above R999 is capped at 7.5% — the same rate as the smallest possible job. For high-ticket providers, this is the most powerful plan on the platform.',
    savingExample:
      "On a R200,000 project: standard commission is R25,500. With your 7.5% cap it's R15,000. You keep R10,500 more — from one project.",
  },
] as const;

// ─── Derived helpers (pure functions, no imports, safe to use anywhere) ───────

/** Return the package config for a given package number (1–5). */
export function getPackage(packageNumber: 1 | 2 | 3 | 4 | 5): PackageConfig {
  const pkg = PACKAGES.find(p => p.packageNumber === packageNumber);
  if (!pkg) throw new Error(`Unknown package number: ${packageNumber}`);
  return pkg;
}

/** Return the package config for a given string id. */
export function getPackageById(id: string): PackageConfig {
  const pkg = PACKAGES.find(p => p.id === id);
  if (!pkg) throw new Error(`Unknown package id: ${id}`);
  return pkg;
}

/** Find the commission bracket for a given sale price. */
export function findBracket(price: number): CommissionBracketDef {
  return (
    COMMISSION_BRACKETS.find(b => price >= b.min && price <= b.max) ??
    COMMISSION_BRACKETS[COMMISSION_BRACKETS.length - 1]
  );
}

/**
 * Calculate the effective commission rate for a sale.
 *
 * @param price         Sale price in Rands.
 * @param ceilingRate   The package's ceiling rate, or null for no cap.
 * @returns             Effective rate as a decimal (e.g. 0.095 = 9.5%).
 */
export function effectiveRate(price: number, ceilingRate: number | null): number {
  const bracket = findBracket(price);
  return ceilingRate !== null ? Math.min(bracket.rate, ceilingRate) : bracket.rate;
}

/**
 * Calculate D4D (Discount 4 Discount) effective rate after the bonus.
 * The bonus reduces the ceiling rate further, floored by COMMISSION_STACKING_FLOOR.
 *
 * @param ceilingRate   Package ceiling rate (must not be null — D4D requires a ceiling).
 * @param d4dBonus      Bonus in rate-points (e.g. 0.025).
 * @returns             Effective rate after bonus, >= COMMISSION_STACKING_FLOOR.
 */
export function d4dEffectiveRate(ceilingRate: number, d4dBonus: number): number {
  return Math.max(COMMISSION_STACKING_FLOOR, ceilingRate - d4dBonus);
}

/**
 * Human-readable formatted percentage string (e.g. 0.075 → "7.5%").
 * Strips trailing ".0" (e.g. 0.10 → "10%" not "10.0%").
 */
export function formatRate(rate: number): string {
  return (rate * 100).toFixed(2).replace(/\.?0+$/, '') + '%';
}

/**
 * Human-readable formatted Rand amount (e.g. 1199 → "R1,199").
 */
export function formatFee(amount: number): string {
  return 'R' + amount.toLocaleString('en-ZA');
}

// ─── platform_config seed (used by migrations and test fixtures) ──────────────

/**
 * The canonical set of key→value pairs that must exist in the platform_config
 * table. The migration INSERT and the test InMemoryConfigStore are both
 * generated from this object — so there is exactly one place to update.
 *
 * Values are stored as strings because platform_config.value is TEXT.
 */
export const PLATFORM_CONFIG_SEED: Record<string, string> = {
  // Legacy single-rate key (kept for backward compat)
  commission_rate: String(COMMISSION_BRACKETS[0].rate),

  // Bracket rates
  commission_rate_bracket_1: String(COMMISSION_BRACKETS[0].rate),
  commission_rate_bracket_2: String(COMMISSION_BRACKETS[1].rate),
  commission_rate_bracket_3: String(COMMISSION_BRACKETS[2].rate),
  commission_rate_bracket_4: String(COMMISSION_BRACKETS[3].rate),
  commission_rate_bracket_5: String(COMMISSION_BRACKETS[4].rate),

  // Bracket boundaries (upper-inclusive per bracket)
  commission_bracket_1_max: String(COMMISSION_BRACKETS[0].max),
  commission_bracket_2_max: String(COMMISSION_BRACKETS[1].max),
  commission_bracket_3_max: String(COMMISSION_BRACKETS[2].max),
  commission_bracket_4_max: String(COMMISSION_BRACKETS[3].max),
  // Bracket 5 has no max — the domain uses the absence of a higher bracket

  // Stacking floor
  commission_stacking_floor: String(COMMISSION_STACKING_FLOOR),

  // Provider subscription fee (Starter plan)
  provider_subscription_fee: String(PACKAGES[0].monthlyFee),

  // Ceiling package rates (ceiling plans only — packages 2–5)
  ceiling_rate_10: String(PACKAGES[1].ceilingRate),
  ceiling_rate_95: String(PACKAGES[2].ceilingRate),
  ceiling_rate_85: String(PACKAGES[3].ceilingRate),
  ceiling_rate_75: String(PACKAGES[4].ceilingRate),

  // Ceiling package monthly fees
  ceiling_fee_10: String(PACKAGES[1].monthlyFee),
  ceiling_fee_95: String(PACKAGES[2].monthlyFee),
  ceiling_fee_85: String(PACKAGES[3].monthlyFee),
  ceiling_fee_75: String(PACKAGES[4].monthlyFee),

  // Discount 4 Discount bonus rate-points per ceiling package
  discount_bonus_10: String(PACKAGES[1].d4dBonus),
  discount_bonus_95: String(PACKAGES[2].d4dBonus),
  discount_bonus_85: String(PACKAGES[3].d4dBonus),
  discount_bonus_75: String(PACKAGES[4].d4dBonus),

  // Temporary commission reductions per package (all 5)
  temp_reduction_pkg_1: String(PACKAGES[0].tempReduction.points),
  temp_reduction_pkg_2: String(PACKAGES[1].tempReduction.points),
  temp_reduction_pkg_3: String(PACKAGES[2].tempReduction.points),
  temp_reduction_pkg_4: String(PACKAGES[3].tempReduction.points),
  temp_reduction_pkg_5: String(PACKAGES[4].tempReduction.points),

  temp_reduction_pkg_1_months: String(PACKAGES[0].tempReduction.months),
  temp_reduction_pkg_2_months: String(PACKAGES[1].tempReduction.months),
  temp_reduction_pkg_3_months: String(PACKAGES[2].tempReduction.months),
  temp_reduction_pkg_4_months: String(PACKAGES[3].tempReduction.months),
  temp_reduction_pkg_5_months: String(PACKAGES[4].tempReduction.months),

  // Price-change moderation bands (Section 5 of pricing model doc)
  price_change_band_1_max_pct: '5.0',
  price_change_band_2_max_pct: '9.5',
  price_change_band_3_max_pct: '25.0',
  price_change_band_4_max_pct: '50.0',
  price_change_high_demand_threshold: '3',

  // Booking auto-expiry
  booking_auto_expiry_hours: '24',

  // Ranking weights (defaults — tunable in DB without a deploy)
  ranking_weight_text_match: '1.0',
  ranking_weight_location: '0.8',
  ranking_weight_tags: '0.6',
  ranking_weight_review_quality: '0.9',
  ranking_weight_completed_bookings: '0.7',
  ranking_weight_profile_completeness: '0.5',
  ranking_weight_reliability_penalty: '0.4',
  ranking_boost_cap: '2.0',
  ranking_reliability_penalty_threshold: '0.2',
  ranking_near_zero_threshold: '0.01',
};

/**
 * Build an InMemoryConfigStore pre-populated from PLATFORM_CONFIG_SEED.
 * Import this in test files instead of hand-writing fixtures:
 *
 *   import { makePricingConfigStore } from '@/lib/pricing-config'
 *   const config = makePricingConfigStore()
 *
 * This is the only place test fixtures should be created — so changing a rate
 * here automatically updates all tests.
 *
 * NOTE: This function imports from lib/domain/config.ts. It is intentionally
 * in this file (not in a test helper) so that non-test code (e.g. a seeder
 * script) can also call it without pulling in test dependencies.
 */
export async function makePricingConfigStore() {
  const { InMemoryConfigStore } = await import('./domain/config');
  return new InMemoryConfigStore(PLATFORM_CONFIG_SEED);
}
