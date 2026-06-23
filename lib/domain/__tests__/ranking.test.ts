import { describe, it, expect } from "vitest";
import {
  computeRelevanceScore,
  applyBoost,
  rankProviders,
  type RelevanceSignals,
  type RankingWeights,
  type ScoredProvider,
} from "../ranking";
import { InMemoryConfigStore, CONFIG_KEYS } from "../config";

// ---------- Fixtures ----------

const EQUAL_WEIGHTS: RankingWeights = {
  textMatch: 1 / 6,
  location: 1 / 6,
  tags: 1 / 6,
  reviewQuality: 1 / 6,
  completedBookings: 1 / 6,
  profileCompleteness: 1 / 6,
  reliabilityPenalty: 0,
};

const FULL_SIGNALS: RelevanceSignals = {
  textMatch: 1,
  location: 1,
  tags: 1,
  reviewQuality: 1,
  completedBookings: 1,
  profileCompleteness: 1,
  reliabilityPenalty: 0,
};

const ZERO_SIGNALS: RelevanceSignals = {
  textMatch: 0,
  location: 0,
  tags: 0,
  reviewQuality: 0,
  completedBookings: 0,
  profileCompleteness: 0,
  reliabilityPenalty: 0,
};

function makeConfig(overrides: Record<string, number> = {}) {
  return new InMemoryConfigStore({
    [CONFIG_KEYS.RANKING_WEIGHT_TEXT_MATCH]: 0.35,
    [CONFIG_KEYS.RANKING_WEIGHT_LOCATION]: 0.25,
    [CONFIG_KEYS.RANKING_WEIGHT_TAGS]: 0.1,
    [CONFIG_KEYS.RANKING_WEIGHT_REVIEW_QUALITY]: 0.1,
    [CONFIG_KEYS.RANKING_WEIGHT_COMPLETED_BOOKINGS]: 0.1,
    [CONFIG_KEYS.RANKING_WEIGHT_PROFILE_COMPLETENESS]: 0.1,
    [CONFIG_KEYS.RANKING_WEIGHT_RELIABILITY_PENALTY]: 0.5,
    [CONFIG_KEYS.RANKING_BOOST_CAP]: 0.5,
    [CONFIG_KEYS.RANKING_NEAR_ZERO_THRESHOLD]: 0.05,
    [CONFIG_KEYS.RANKING_RELIABILITY_PENALTY_THRESHOLD]: 0.7,
    ...overrides,
  });
}

// ---------- computeRelevanceScore ----------

describe("computeRelevanceScore", () => {
  it("returns ~1.0 for a perfect signal set with sum-to-1 weights", () => {
    const score = computeRelevanceScore(FULL_SIGNALS, EQUAL_WEIGHTS);
    expect(score).toBeCloseTo(1, 5);
  });

  it("returns 0 for zero signals", () => {
    expect(computeRelevanceScore(ZERO_SIGNALS, EQUAL_WEIGHTS)).toBe(0);
  });

  it("subtracts reliability penalty (weighted)", () => {
    const signals: RelevanceSignals = {
      ...FULL_SIGNALS,
      reliabilityPenalty: 1,
    };
    const weights: RankingWeights = {
      ...EQUAL_WEIGHTS,
      reliabilityPenalty: 0.3,
    };
    const score = computeRelevanceScore(signals, weights);
    const withoutPenalty = computeRelevanceScore(FULL_SIGNALS, { ...weights, reliabilityPenalty: 0 });
    expect(score).toBeLessThan(withoutPenalty);
  });

  it("clamps to 0 when penalty exceeds positive signals", () => {
    const signals: RelevanceSignals = { ...ZERO_SIGNALS, reliabilityPenalty: 1 };
    const weights: RankingWeights = { ...EQUAL_WEIGHTS, reliabilityPenalty: 1 };
    expect(computeRelevanceScore(signals, weights)).toBe(0);
  });
});

// ---------- applyBoost ----------

describe("applyBoost", () => {
  const CAP = 0.5;
  const NEAR_ZERO = 0.05;

  it("applies boost as a multiplier (RANK-LOGIC-003)", () => {
    // 0.71 * (1 + 0.5) = 1.065 — matches doc worked example for Provider B
    expect(applyBoost(0.71, 0.5, CAP, NEAR_ZERO)).toBeCloseTo(1.065, 3);
  });

  it("caps boost at the configured maximum (RANK-LOGIC-005)", () => {
    const uncapped = applyBoost(0.71, 2.0, CAP, NEAR_ZERO);
    const capped = applyBoost(0.71, 0.5, CAP, NEAR_ZERO);
    expect(uncapped).toBe(capped); // 2.0 is capped to 0.5
  });

  it("does NOT elevate a near-zero relevance score (RANK-LOGIC-004)", () => {
    // Provider C from the doc: relevance_score=0.04, below threshold of 0.05
    const score = applyBoost(0.04, 0.5, CAP, NEAR_ZERO);
    expect(score).toBe(0.04); // boost has zero effect
  });

  it("applies boost normally when relevance is above the near-zero threshold", () => {
    const score = applyBoost(0.06, 0.5, CAP, NEAR_ZERO); // just above threshold
    expect(score).toBeGreaterThan(0.06);
  });
});

// ---------- rankProviders — doc worked example (Section 4.2) ----------

describe("rankProviders", () => {
  // Providers from the doc's worked example:
  // A: relevance=0.92, no boost   → final=0.92
  // B: relevance=0.71, boost=0.5  → final=1.065
  // C: relevance=0.04, boost=0.5  → final≈0.04 (near-zero, boost suppressed)
  //
  // Expected order: B, A, C

  function makeProviderWithRelevance(
    id: string,
    textMatch: number,
    boost: number | null,
  ): ScoredProvider {
    return {
      providerId: id,
      isPublished: true,
      signals: {
        textMatch,
        location: 0,
        tags: 0,
        reviewQuality: 0,
        completedBookings: 0,
        profileCompleteness: 0,
        reliabilityPenalty: 0,
      },
      activeBoostFactor: boost,
      reliabilityPenaltyScore: 0,
    };
  }

  it("matches the doc worked example: B > A > C (RANK-LOGIC-003/004)", async () => {
    // We drive text_match as the single signal with weight=1 to replicate the
    // doc's raw relevance numbers (A=0.92, B=0.71, C=0.04).
    const config = makeConfig({
      [CONFIG_KEYS.RANKING_WEIGHT_TEXT_MATCH]: 1,
      [CONFIG_KEYS.RANKING_WEIGHT_LOCATION]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_TAGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_REVIEW_QUALITY]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_COMPLETED_BOOKINGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_PROFILE_COMPLETENESS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_RELIABILITY_PENALTY]: 0,
    });

    const providers: ScoredProvider[] = [
      makeProviderWithRelevance("A", 0.92, null),
      makeProviderWithRelevance("B", 0.71, 0.5),
      makeProviderWithRelevance("C", 0.04, 0.5),
    ];

    const ranked = await rankProviders(providers, config);
    expect(ranked.map((r) => r.providerId)).toEqual(["B", "A", "C"]);
  });

  it("a boosted irrelevant provider (C) cannot outrank a relevant unpaid one (A) — RANK-LOGIC-004 guardrail", async () => {
    const config = makeConfig({
      [CONFIG_KEYS.RANKING_WEIGHT_TEXT_MATCH]: 1,
      [CONFIG_KEYS.RANKING_WEIGHT_LOCATION]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_TAGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_REVIEW_QUALITY]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_COMPLETED_BOOKINGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_PROFILE_COMPLETENESS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_RELIABILITY_PENALTY]: 0,
    });

    const providers: ScoredProvider[] = [
      makeProviderWithRelevance("A", 0.92, null),   // relevant, unpaid
      makeProviderWithRelevance("C", 0.04, 0.5),    // irrelevant, paid
    ];

    const ranked = await rankProviders(providers, config);
    const aRank = ranked.findIndex((r) => r.providerId === "A");
    const cRank = ranked.findIndex((r) => r.providerId === "C");
    expect(aRank).toBeLessThan(cRank); // A must rank above C
  });

  it("excludes unpublished providers (RANK-LOGIC-001)", async () => {
    const config = makeConfig();
    const providers: ScoredProvider[] = [
      {
        providerId: "unpublished",
        isPublished: false,
        signals: FULL_SIGNALS,
        activeBoostFactor: null,
        reliabilityPenaltyScore: 0,
      },
    ];
    const ranked = await rankProviders(providers, config);
    expect(ranked).toHaveLength(0);
  });

  it("suppresses boost for providers above the reliability penalty threshold (RANK-LOGIC-006)", async () => {
    const config = makeConfig({
      [CONFIG_KEYS.RANKING_WEIGHT_TEXT_MATCH]: 1,
      [CONFIG_KEYS.RANKING_WEIGHT_LOCATION]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_TAGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_REVIEW_QUALITY]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_COMPLETED_BOOKINGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_PROFILE_COMPLETENESS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_RELIABILITY_PENALTY]: 0,
    });

    const providers: ScoredProvider[] = [
      {
        providerId: "bad-actor",
        isPublished: true,
        signals: { ...ZERO_SIGNALS, textMatch: 0.5 },
        activeBoostFactor: 0.5,
        reliabilityPenaltyScore: 0.9, // above threshold of 0.7
      },
      {
        providerId: "good-provider",
        isPublished: true,
        signals: { ...ZERO_SIGNALS, textMatch: 0.5 },
        activeBoostFactor: null,
        reliabilityPenaltyScore: 0,
      },
    ];

    const ranked = await rankProviders(providers, config);
    const badActor = ranked.find((r) => r.providerId === "bad-actor")!;
    expect(badActor.boostFactor).toBe(0); // boost was suppressed
    // Both should end up with the same finalScore (same relevance, no boost for either)
    const goodProvider = ranked.find((r) => r.providerId === "good-provider")!;
    expect(badActor.finalScore).toBeCloseTo(goodProvider.finalScore, 5);
  });

  it("sorts results descending by finalScore", async () => {
    const config = makeConfig({
      [CONFIG_KEYS.RANKING_WEIGHT_TEXT_MATCH]: 1,
      [CONFIG_KEYS.RANKING_WEIGHT_LOCATION]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_TAGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_REVIEW_QUALITY]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_COMPLETED_BOOKINGS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_PROFILE_COMPLETENESS]: 0,
      [CONFIG_KEYS.RANKING_WEIGHT_RELIABILITY_PENALTY]: 0,
    });

    const providers: ScoredProvider[] = [
      makeProviderWithRelevance("low", 0.3, null),
      makeProviderWithRelevance("mid", 0.6, null),
      makeProviderWithRelevance("high", 0.9, null),
    ];

    const ranked = await rankProviders(providers, config);
    expect(ranked[0].finalScore).toBeGreaterThanOrEqual(ranked[1].finalScore);
    expect(ranked[1].finalScore).toBeGreaterThanOrEqual(ranked[2].finalScore);
  });
});
