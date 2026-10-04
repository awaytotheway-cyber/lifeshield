import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { PlanRoadmap } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InterventionCard } from "@/components/ui/InterventionCard";
import { Screen } from "@/components/ui/Screen";
import { GradientHero } from "@/components/ui/GradientHero";
import { PrimaryButton as GradientButton } from "@/components/ui/PrimaryButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Feather } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import type { StatusChipKind } from "@/components/ui/StatusChip";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { Accent, Ink } from "@/lib/specimen-tokens";
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
    <View style={styles.root}>
      <View style={{ position: "relative" }}>
        <GradientHero
          height={200}
          onBack={() => router.replace(routes.labResults)}
          backLabel={COPY.planBackResults}
        >
          <View style={styles.heroInner}>
            <Text style={styles.heroTitle}>{planTitle}</Text>
            <Text style={styles.heroSub}>{COPY.planBody}</Text>
          </View>
        </GradientHero>
        {/* Glass-dark approval strip pinned to the hero bottom. */}
        <View style={styles.approvalStrip}>
          <View style={styles.approvalFill} />
          <View style={styles.approvalRow}>
            <Feather name="check-circle" size={13} color={colors.pureWhite} />
            <Text style={styles.approvalText}>{planBanner}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.pad}>
          <StaticSkeleton rows={4} />
        </View>
      ) : null}

      {message ? (
        <View style={styles.pad}>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.planRetry} onPress={() => void loadExisting()} />
        </View>
      ) : null}

      {!loading && !message && rows.length === 0 ? (
        <View style={styles.pad}>
          <EmptyState
            icon="list"
            heading={COPY.planEmptyHeading}
            explanation={COPY.planEmpty}
          />
        </View>
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
              return (
                <View style={styles.groupWrap}>
                  <SectionHeader title={item.title} />
                </View>
              );
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

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <GradientButton
          label={COPY.planBrowseStore}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  pad: {
    paddingHorizontal: spacing.screenX,
  },
  heroInner: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 28,
  },
  heroTitle: {
    fontFamily: fontFamily.heading,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: Ink.full,
  },
  heroSub: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 24,
    color: Ink.soft,
  },
  approvalStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
    overflow: "hidden",
    justifyContent: "center",
  },
  approvalFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.charcoal,
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.screenX,
  },
  approvalText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: Ink.full,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.dangerRed,
    textAlign: "center",
  },
  roadmap: {
    alignItems: "center",
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: spacing.screenX,
    paddingTop: 20,
    paddingBottom: 16,
  },
  groupWrap: {
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: spacing.screenX,
    paddingTop: 8,
    gap: 4,
  },
  cardGap: {
    marginBottom: 12,
  },
});
