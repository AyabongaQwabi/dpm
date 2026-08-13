-- =============================================================================
-- Booking lifecycle, step 1 of 2: status vocabulary only.
--
-- This file contains ONLY the ALTER TYPE ... ADD VALUE statements plus column
-- additions. It is deliberately separate from 20260818000001 because Postgres
-- forbids using a newly added enum value in the same transaction that adds it
-- (55P04 "unsafe use of new value of enum type"). Supabase runs each migration
-- file in its own transaction, so the new values are committed and usable by
-- the time the next file runs.
--
-- Idempotent and strictly additive. No existing column is dropped or has its
-- meaning changed.
--
-- ── Enum decision ───────────────────────────────────────────────────────────
-- The target vocabulary is:
--   pending_acceptance, accepted, in_progress, completed_by_provider,
--   completed, declined, cancelled, disputed
--
-- The live enum is: requested | accepted | declined | completed | cancelled.
--
-- We ADD the three genuinely new values (in_progress, completed_by_provider,
-- disputed) and KEEP 'requested' as the stored value for the
-- "pending_acceptance" concept. Rationale:
--   * ALTER TYPE ... ADD VALUE is an online, low-risk operation. Renaming a
--     value in a live enum is not, and 'requested' is referenced by the
--     create_booking_with_credit_spend RPC default, the bookings column
--     default, the auto-expiry cron index, and ~8 application call sites.
--   * The rename buys nothing at runtime — it is a labelling concern, and
--     labelling is handled in one place (lib/domain/booking-status.ts maps
--     'requested' → "Waiting for provider" on every customer-facing surface).
-- If the stored value should later actually be renamed, that is a separate,
-- deliberate migration. Flagged in the build report.
--
-- 'disputed' becomes a real status. The pre-existing workaround — a
-- 'cancelled' row carrying cancellation_reason = '__dispute__' — is left
-- untouched on historical rows (additive rule); lib/domain/booking-status.ts
-- treats that marker as disputed for display so old rows still read correctly.
-- =============================================================================

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed_by_provider';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';

-- Timestamps the lifecycle needs but the base table never carried.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_nudge_at TIMESTAMPTZ;
