import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { PlanRoadmap } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InterventionCard } from "@/components/ui/InterventionCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import type { StatusChipKind } from "@/components/ui/StatusChip";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { groupInterventions } from "@/lib/plan-groups";
import {
  planBannerForState,
  planReviewState,
  planTitleForState,
} from "@/lib/plan-review-state";
import {
  loadOwnInterventions,
  regenerateDraftPlan,
  type InterventionRow,
} from "@/lib/plan";
import { planItemHref, routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

type ListRow =
  | { kind: "heading"; id: string; title: string }
  | { kind: "item"; id: string; row: InterventionRow };

function planChip(
  row: InterventionRow,
): { status: Extract<StatusChipKind, "approved" | "draft" | "critical">; label: string } {
  if (row.clinician_interaction_check) {
    return { status: "critical", label: COPY.planNeedsCheck };
  }
  if (row.status === "clinician_approved" || row.status === "active") {
    return { status: "approved", label: COPY.planStatusReviewed };
  }
  return { status: "draft", label: "Pending review" };
}

function categoryIcon(
  category: string,
): "supplement" | "diet" | "lifestyle" | "therapy" | "referral" | "coaching" | "retest" {
  if (
    category === "supplement" ||
    category === "diet" ||
    category === "lifestyle" ||
    category === "therapy" ||
    category === "referral" ||
    category === "coaching" ||
    category === "retest"
  ) {
    return category;
  }
  return "lifestyle";
}

export default function PlanScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<InterventionRow[]>([]);
  const windowWidth = useWindowDimensions().width;
  const roadmapWidth = Math.max(160, windowWidth - spacing.screenX * 2);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("feature_flags")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const testBookingEnabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.test_booking_v1
      : isFeatureEnabled(profile, "test_booking_v1");
  const hasReferral = useMemo(
    () => rows.some((row) => String(row.category) === "referral"),
    [rows],
  );
  const showBookCta = testBookingEnabled && hasReferral;

  const applyRows = useCallback((next: InterventionRow[]) => {
    setRows(next);
  }, []);

  const loadExisting = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      const result = await loadOwnInterventions(session.user.id);
      if (!result.ok) {
        setMessage(result.message);
        applyRows([]);
        return;
      }
      setMessage(null);
      if (result.rows.length === 0) {
        const generated = await regenerateDraftPlan(session.user.id);
        if (!generated.ok) {
          setMessage(generated.message);
          applyRows([]);
          return;
        }
        applyRows(generated.rows);
        return;
      }
      applyRows(result.rows);
    } catch {
      setMessage(COPY.planLoadFailed);
      applyRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, applyRows]);

  const refreshDrafts = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setRefreshing(true);
    try {
      const generated = await regenerateDraftPlan(session.user.id);
      if (!generated.ok) {
        setMessage(generated.message);
        applyRows([]);
        return;
      }
      setMessage(null);
      applyRows(generated.rows);
    } catch {
      setMessage(COPY.planGenerateFailed);
    } finally {
      setRefreshing(false);
    }
  }, [session?.user.id, applyRows]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void loadExisting();
  }, [session?.user.id, loadExisting]);

  const grouped = useMemo(() => groupInterventions(rows), [rows]);
  const reviewState = useMemo(() => planReviewState(rows), [rows]);
  const planTitle = useMemo(() => planTitleForState(reviewState), [reviewState]);
  const planBanner = useMemo(
    () => planBannerForState(reviewState),
    [reviewState],
  );

  const listData = useMemo<ListRow[]>(() => {
    const out: ListRow[] = [];
    for (const group of grouped) {
      out.push({ kind: "heading", id: `h-${group.key}`, title: group.label });
      for (const row of group.items) {
        out.push({ kind: "item", id: row.id, row });
      }
    }
    return out;
  }, [grouped]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  return (
    <Screen contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={planTitle}
        onBack={() => router.replace(routes.labResults)}
        backLabel={COPY.planBackResults}
      />
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{planBanner}</Text>
      </View>
      <Text style={styles.body}>{COPY.planBody}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.planRetry} onPress={() => void loadExisting()} />
        </>
      ) : null}

      {!loading && !message && rows.length === 0 ? (
        <EmptyState
          icon="list"
          heading={COPY.planEmptyHeading}
          explanation={COPY.planEmpty}
        />
      ) : null}

      {!loading && !message && rows.length > 0 ? (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.roadmap}>
              <PlanRoadmap width={roadmapWidth} height={120} />
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === "heading") {
              return <Text style={styles.group}>{item.title}</Text>;
            }
            const chip = planChip(item.row);
            return (
              <View style={styles.cardGap}>
                <InterventionCard
                  title={item.row.title}
                  why={
                    item.row.plain_reason?.trim() || COPY.planDetailNotInstruction
                  }
                  clinicalBasis={
                    item.row.clinical_basis?.trim() || item.row.trigger_finding
                  }
                  category={categoryIcon(String(item.row.category))}
                  status={chip.status}
                  statusLabel={chip.label}
                  onPress={() => {
                    router.push(planItemHref(item.row.id));
                  }}
                />
              </View>
            );
          }}
        />
      ) : null}

      {/*
        Phase D: when the user has a referral-category recommendation and
        the booking flag is on, promote the book flow to a primary CTA
        alongside "Browse store". Hidden otherwise — noise for users
        without referrals or without the flag.
      */}
      {showBookCta ? (
        <PrimaryButton
          title="Book a test"
          onPress={() => {
            router.push(routes.ordersBook);
          }}
        />
      ) : null}
      <PrimaryButton
        title={COPY.planBrowseStore}
        onPress={() => {
          router.push(routes.store);
        }}
      />
      <TextButton
        title={COPY.planOpenFollowUp}
        onPress={() => {
          router.push(routes.followUp);
        }}
      />
      <TextButton
        title={COPY.planRefresh}
        loading={refreshing}
        onPress={() => {
          void refreshDrafts();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 8,
    backgroundColor: colors.sageLight,
    borderRadius: radius.alert,
    padding: spacing.base,
  },
  bannerText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  roadmap: {
    alignItems: "center",
    marginBottom: 8,
  },
  list: {
    paddingBottom: 16,
  },
  group: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    color: colors.deepTeal,
  },
  cardGap: {
    marginBottom: 12,
  },
});
