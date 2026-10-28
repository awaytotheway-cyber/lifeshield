/**
 * Per-user feature flags. Defaults live here (in code); overrides live on
 * profiles.feature_flags (jsonb). Read via isFeatureEnabled(profile, flag).
 *
 * Add a new flag by:
 *   1. Extending FeatureFlagName below.
 *   2. Adding a default to FEATURE_FLAG_DEFAULTS.
 *   3. Wrapping the entry-point UI in isFeatureEnabled(...).
 *
 * Rollout mechanic:
 *   - Ship new features with default = false.
 *   - Enable per beta account by writing profiles.feature_flags = { <flag>: true }.
 *   - Flip the default to true after monitoring shows no regressions.
 */

export type FeatureFlagName =
  /** Phase A — user-defined SMART goals surface + create flow. */
  | "goals_v1"
  /** Phase A — user-defined reminders surface (list + create + notifications). */
  | "reminders_v1"
  /**
   * Phase B — expanded intervention detail: template-rendered rationale,
   * action steps, resources, and per-intervention progress log. Additive to
   * the existing detail screen; when off, users see the current view.
   */
  | "plan_v2"
  /**
   * Phase C — recipe library browse + favorite. Meal planning and the
   * ingredient → cart bridge are separate flags on a later slice.
   */
  | "recipes_v1"
  /**
   * Phase C — weekly meal planner: generate a plan from the recipe library
   * with slot-tag heuristic + avoid-tag filter, save and browse days/meals.
   * Ingredient → cart export deferred to its own slice.
   */
  | "meal_planner_v1"
  /**
   * Phase D — book a test with a partner lab. Reads test_orders where
   * status='recommended', filters labs by profile location, creates a
   * pending_manual lab_orders row with the chosen slot.
   */
  | "test_booking_v1"
  /**
   * Phase E — richer supplement detail: contraindication warnings against
   * the user's medications, supporting-studies list, subscription info.
   * Cart-level subscription plumbing waits on Stripe Subscriptions.
   */
  | "supplements_v2"
  /**
   * Phase F — genetic panel ordering. Users can browse the catalogue and
   * raise a pending_manual order; result ingestion + rules-engine
   * integration wait on a signed partner contract.
   */
  | "genetic_testing_v1"
  /**
   * Phase G — activity tracking. Users can log daily steps / active
   * minutes / heart-rate resting manually today; HealthKit and Google Fit
   * bridges plug into lib/activity-source when the native modules land.
   */
  | "activity_v1"
  /**
   * Phase J social: buddy discovery and chat. Default off per the rollout
   * rule. Gates the whole social surface — discovery, connections, threads
   * and the "Let others find me" switch in Settings — because discovery is
   * the only route by which one member learns another exists, and that is
   * not something to light up for everyone before the moderation queue has
   * been watched in production.
   */
  | "social_v1"
  /**
   * Protocol Tier 1 ordering: once a patient has consented, BRCA1/2 (if
   * indicated) and CTC are added to their Tests list as recommended orders.
   * Off by default: the app says it does not book or interpret tests, and the
   * protocol itself asks for governance review before this is used with
   * patients. Turn it on per account, then by default, once that is done.
   */
  | "tier1_ordering_v1";

export const FEATURE_FLAG_DEFAULTS: Readonly<Record<FeatureFlagName, boolean>> =
  Object.freeze({
    goals_v1: false,
    reminders_v1: false,
    plan_v2: false,
    recipes_v1: false,
    meal_planner_v1: false,
    test_booking_v1: false,
    supplements_v2: false,
    genetic_testing_v1: false,
    activity_v1: false,
    social_v1: false,
    tier1_ordering_v1: false,
  });

/**
 * A profile-like shape. Kept structural so callers can pass the auth-store
 * profile row without importing a Supabase type here.
 */
export type FeatureFlagProfile = {
  feature_flags?: Record<string, unknown> | null;
};

/**
 * Returns true when the flag is on for this profile.
 *
 * Precedence (highest first):
 *   1. Per-user override (profile.feature_flags[flag])
 *   2. FEATURE_FLAG_DEFAULTS[flag]
 *
 * A missing profile falls back to the default. A non-boolean override is
 * ignored (treated as "not set"), so we never light up a feature based on
 * accidental strings or numbers written into the jsonb column.
 */
export function isFeatureEnabled(
  profile: FeatureFlagProfile | null | undefined,
  flag: FeatureFlagName,
): boolean {
  const override = profile?.feature_flags?.[flag];
  if (typeof override === "boolean") {
    return override;
  }
  return FEATURE_FLAG_DEFAULTS[flag];
}

/**
 * Returns the effective flag map for a profile, useful for debug screens
 * or when several flags need to gate the same render pass.
 */
export function resolveFeatureFlags(
  profile: FeatureFlagProfile | null | undefined,
): Record<FeatureFlagName, boolean> {
  const resolved = { ...FEATURE_FLAG_DEFAULTS } as Record<
    FeatureFlagName,
    boolean
  >;
  const overrides = profile?.feature_flags;
  if (overrides && typeof overrides === "object") {
    for (const key of Object.keys(resolved) as FeatureFlagName[]) {
      const value = overrides[key];
      if (typeof value === "boolean") {
        resolved[key] = value;
      }
    }
  }
  return resolved;
}
