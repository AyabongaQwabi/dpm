// Pro membership entitlement config — single source of truth for which
// pro_memberships.source values grant which feature keys.
//
// Pro is a paid membership, not a verification tier (see /verification).
// This map is the only place Batch B's feature gates should read from.
// No component or route handler should query pro_memberships directly —
// always go through hasEntitlement() in lib/domain/entitlements.ts.
//
// Every commercial number (price, cap) lives in config/pro-membership.json,
// not here — this file only holds structural identifiers (entitlement keys,
// the grant map) that aren't business decisions. Edit the JSON to change a
// price or cap; a deploy is required to pick it up (static import, same
// convention as config/feature-pauses.json).

import proMembershipConfig from '../config/pro-membership.json'

export const ENTITLEMENT_KEYS = {
  ANALYTICS: 'pro.analytics',
  GALLERY_EXPANDED: 'pro.gallery_expanded',
  LISTINGS_UNLIMITED: 'pro.listings_unlimited',
  PROFILE_CUSTOMISATION: 'pro.profile_customisation',
  // Correction: publishing itself is free for every provider (a marketplace
  // where only paying providers can post loses most of the content it would
  // otherwise get from 4,000+ listings). This key only raises the caps —
  // hasEntitlement() answers "does the RAISED limit apply", never "can this
  // provider publish at all". See lib/domain/provider-posts.ts for how the
  // free-tier numbers are the default, not the exception.
  PUBLISHING_LIMITS: 'pro.publishing_limits',
  CUSTOM_SLUG: 'pro.custom_slug',
  TEAM_SEATS: 'pro.team_seats',
} as const

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS]

// pro_memberships.source values that count as "holding Pro" for entitlement
// purposes. All three sources (purchased, package_included, granted) grant
// the same entitlements while status = 'active' — source only affects how
// the membership started and how it's billed, not what it unlocks.
export const PRO_MEMBERSHIP_SOURCES = ['purchased', 'package_included', 'granted'] as const

// Every entitlement key currently maps 1:1 to "provider holds an active Pro
// membership, regardless of source." Kept as an explicit map (not a boolean)
// so future tiers can grant a subset of keys without changing callers.
export const ENTITLEMENT_GRANTS: Record<EntitlementKey, readonly (typeof PRO_MEMBERSHIP_SOURCES)[number][]> = {
  [ENTITLEMENT_KEYS.ANALYTICS]: PRO_MEMBERSHIP_SOURCES,
  [ENTITLEMENT_KEYS.GALLERY_EXPANDED]: PRO_MEMBERSHIP_SOURCES,
  [ENTITLEMENT_KEYS.LISTINGS_UNLIMITED]: PRO_MEMBERSHIP_SOURCES,
  [ENTITLEMENT_KEYS.PROFILE_CUSTOMISATION]: PRO_MEMBERSHIP_SOURCES,
  [ENTITLEMENT_KEYS.PUBLISHING_LIMITS]: PRO_MEMBERSHIP_SOURCES,
  [ENTITLEMENT_KEYS.CUSTOM_SLUG]: PRO_MEMBERSHIP_SOURCES,
  [ENTITLEMENT_KEYS.TEAM_SEATS]: PRO_MEMBERSHIP_SOURCES,
}

// Packages that include Pro automatically when active (source = package_included).
// Package 1 (Starter/base) never includes Pro. Sourced from config/pro-membership.json.
export const PACKAGE_NUMBERS_INCLUDING_PRO: readonly number[] = proMembershipConfig.packageNumbersIncludingPro

// Pro standalone pricing, in credits (1 credit = R1) — debited from the
// provider's credit wallet via spend_provider_wallet, never a direct Yoco
// charge. If the wallet is short, the provider tops up through the existing
// top-up flow first. Sourced from config/pro-membership.json.
export const PRO_MEMBERSHIP_CONFIG = {
  monthlyFee: proMembershipConfig.pricing.monthlyFeeCredits,
  annualFee: proMembershipConfig.pricing.annualFeeCredits, // 10 months' worth — 2 months free vs. monthly billing
} as const

// Free-tier vs. Pro caps, sourced from config/pro-membership.json. No cap
// existed on either gallery images or service listings before Batch B.
export const FREE_TIER_GALLERY_IMAGE_CAP = proMembershipConfig.caps.freeTierGalleryImages
export const PRO_GALLERY_IMAGE_CAP = proMembershipConfig.caps.proGalleryImages

// null = unlimited. Free tier gets a small number of active listings; Pro
// removes the cap entirely (pro.listings_unlimited).
export const FREE_TIER_SERVICE_LISTING_CAP = proMembershipConfig.caps.freeTierServiceListings
