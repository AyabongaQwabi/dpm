// Phase 3: Implement search scoring per business logic Section 4 (RANK-LOGIC-001 through 007).
// Pure functions only — no framework imports (ARCH-006).

import { ConfigStore, CONFIG_KEYS, getConfigNumber } from "./config";

// ---------- Types ----------

// Caller normalises each signal to 0–1 before passing in.
export interface RelevanceSignals {
  textMatch: number;           // 0–1
  location: number;            // 0–1
  tags: number;                // 0–1
  reviewQuality: number;       // 0–1
  completedBookings: number;   // 0–1 (normalised count)
  profileCompleteness: number; // 0–1
  reliabilityPenalty: number;  // 0–1 (higher = worse; subtracted after weighting)
}

export interface RankingWeights {
  textMatch: number;
  location: number;
  tags: number;
  reviewQuality: number;
  completedBookings: number;
  profileCompleteness: number;
  reliabilityPenalty: number;
}

export interface ScoredProvider {
  providerId: string;
  isPublished: boolean;
  signals: RelevanceSignals;
  activeBoostFactor: number | null; // null = no active paid placement
  reliabilityPenaltyScore: number;  // 0–1, mirrors signals.reliabilityPenalty for threshold check
}

export interface RankedProvider {
  providerId: string;
  relevanceScore: number;
  boostFactor: number;
  finalScore: number;
}

// ---------- Config helpers ----------

async function loadWeights(config: ConfigStore): Promise<RankingWeights> {
  const [
    textMatch,
    location,
    tags,
    reviewQuality,
    completedBookings,
    profileCompleteness,
    reliabilityPenalty,
  ] = await Promise.all([
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_TEXT_MATCH),
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_LOCATION),
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_TAGS),
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_REVIEW_QUALITY),
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_COMPLETED_BOOKINGS),
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_PROFILE_COMPLETENESS),
    getConfigNumber(config, CONFIG_KEYS.RANKING_WEIGHT_RELIABILITY_PENALTY),
  ]);
  return {
    textMatch,
    location,
    tags,
    reviewQuality,
    completedBookings,
    profileCompleteness,
    reliabilityPenalty,
  };
}

// ---------- 4.1 Base relevance score ----------
//
// RANK-LOGIC-002: all weights are config-driven.
// Reliability penalty is weighted and subtracted; score is clamped to [0, 1].

export function computeRelevanceScore(
  signals: RelevanceSignals,
  weights: RankingWeights,
): number {
  const positiveComponent =
    signals.textMatch * weights.textMatch +
    signals.location * weights.location +
    signals.tags * weights.tags +
    signals.reviewQuality * weights.reviewQuality +
    signals.completedBookings * weights.completedBookings +
    signals.profileCompleteness * weights.profileCompleteness;

  const penaltyComponent = signals.reliabilityPenalty * weights.reliabilityPenalty;

  const raw = positiveComponent - penaltyComponent;
  return Math.max(0, Math.min(1, raw));
}

// ---------- 4.2 Paid placement boost ----------
//
// RANK-LOGIC-003: final_score = relevance_score × (1 + boost_factor)
// RANK-LOGIC-004: near-zero relevance_score is NOT boosted into visible results.
// RANK-LOGIC-005: boost_factor capped at configurable maximum.

export function applyBoost(
  relevanceScore: number,
  boostFactor: number,
  boostCap: number,
  nearZeroThreshold: number,
): number {
  // RANK-LOGIC-004: irrelevant providers must not be elevated by boost alone.
  if (relevanceScore <= nearZeroThreshold) {
    return relevanceScore; // boost has no effect
  }

  const cappedBoost = Math.min(boostFactor, boostCap);
  return relevanceScore * (1 + cappedBoost);
}

// ---------- Full ranking pipeline ----------
//
// RANK-LOGIC-001: only published providers are eligible.
// RANK-LOGIC-006: providers with reliability penalty above threshold cannot
//   activate paid placement (checked at purchase time, but also enforced here
//   by ignoring their boost_factor).

export async function rankProviders(
  candidates: ScoredProvider[],
  config: ConfigStore,
): Promise<RankedProvider[]> {
  const [weights, boostCap, nearZeroThreshold, reliabilityThreshold] =
    await Promise.all([
      loadWeights(config),
      getConfigNumber(config, CONFIG_KEYS.RANKING_BOOST_CAP),
      getConfigNumber(config, CONFIG_KEYS.RANKING_NEAR_ZERO_THRESHOLD),
      getConfigNumber(config, CONFIG_KEYS.RANKING_RELIABILITY_PENALTY_THRESHOLD),
    ]);

  const scored: RankedProvider[] = [];

  for (const provider of candidates) {
    // RANK-LOGIC-001
    if (!provider.isPublished) continue;

    const relevanceScore = computeRelevanceScore(provider.signals, weights);

    // RANK-LOGIC-006: provider with a high reliability penalty cannot benefit from boost.
    const boostEligible =
      provider.reliabilityPenaltyScore < reliabilityThreshold;
    const rawBoost =
      boostEligible && provider.activeBoostFactor !== null
        ? provider.activeBoostFactor
        : 0;

    const finalScore = applyBoost(
      relevanceScore,
      rawBoost,
      boostCap,
      nearZeroThreshold,
    );

    scored.push({
      providerId: provider.providerId,
      relevanceScore,
      boostFactor: rawBoost,
      finalScore,
    });
  }

  // Sort descending by finalScore.
  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored;
}
