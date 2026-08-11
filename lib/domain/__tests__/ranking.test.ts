import { describe, it, expect } from "vitest";
import {
  computeRelevanceScore,
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

// ---------- rankProviders ----------
//
// Paid ranking boost (applyBoost, RANK-LOGIC-003/004/005/006) was removed —
// the paid_placements table it read from had zero rows in production and
// contradicted the platform rule that sponsored placement is bought time,
// never bought rank (see lib/domain/ranking.ts).

describe("rankProviders", () => {
  function makeProviderWithRelevance(
    id: string,
    textMatch: number,
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
    };
  }

  it("excludes unpublished providers (RANK-LOGIC-001)", async () => {
    const config = makeConfig();
    const providers: ScoredProvider[] = [
      {
        providerId: "unpublished",
        isPublished: false,
        signals: FULL_SIGNALS,
      },
    ];
    const ranked = await rankProviders(providers, config);
    expect(ranked).toHaveLength(0);
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
      makeProviderWithRelevance("low", 0.3),
      makeProviderWithRelevance("mid", 0.6),
      makeProviderWithRelevance("high", 0.9),
    ];

    const ranked = await rankProviders(providers, config);
    expect(ranked[0].finalScore).toBeGreaterThanOrEqual(ranked[1].finalScore);
    expect(ranked[1].finalScore).toBeGreaterThanOrEqual(ranked[2].finalScore);
  });

  it("produces a byte-identical result for a Pro and a non-Pro provider with the same profile signals", async () => {
    // ScoredProvider has no membership/subscription/package field at all —
    // there is nowhere for Pro status to enter this function. This test
    // proves it at the call level: two providers with identical signals
    // (one hypothetically Pro, one not — the type has no way to say which)
    // produce identical output.
    const config = makeConfig();
    const signals: RelevanceSignals = {
      textMatch: 0.6,
      location: 0.4,
      tags: 0.5,
      reviewQuality: 0.8,
      completedBookings: 0.3,
      profileCompleteness: 0.7,
      reliabilityPenalty: 0.1,
    };

    const providers: ScoredProvider[] = [
      { providerId: "non-pro-provider", isPublished: true, signals },
      { providerId: "pro-provider", isPublished: true, signals },
    ];

    const ranked = await rankProviders(providers, config);
    const nonPro = ranked.find((r) => r.providerId === "non-pro-provider")!;
    const pro = ranked.find((r) => r.providerId === "pro-provider")!;

    expect(pro.relevanceScore).toBe(nonPro.relevanceScore);
    expect(pro.finalScore).toBe(nonPro.finalScore);
  });
});
