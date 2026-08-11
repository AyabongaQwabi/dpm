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
}

export interface RankedProvider {
  providerId: string;
  relevanceScore: number;
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

// ---------- Full ranking pipeline ----------
//
// RANK-LOGIC-001: only published providers are eligible.
//
// Paid ranking boost (former RANK-LOGIC-003/004/005/006, paid_placements
// table, applyBoost()) was removed — it had zero rows in production and
// contradicted the platform rule that sponsored placement is bought time,
// never bought rank. Sponsored inventory (sponsored_placements) renders in
// its own reserved, labelled slots and never touches this scoring pipeline.

export async function rankProviders(
  candidates: ScoredProvider[],
  config: ConfigStore,
): Promise<RankedProvider[]> {
  const weights = await loadWeights(config);

  const scored: RankedProvider[] = [];

  for (const provider of candidates) {
    // RANK-LOGIC-001
    if (!provider.isPublished) continue;

    const relevanceScore = computeRelevanceScore(provider.signals, weights);

    scored.push({
      providerId: provider.providerId,
      relevanceScore,
      finalScore: relevanceScore,
    });
  }

  // Sort descending by finalScore.
  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored;
}
