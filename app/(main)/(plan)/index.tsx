import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { BackButton } from "@/components/ui/BackButton";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Hero } from "@/components/ui/Hero";
import {
  InterventionCard,
  type InterventionTone,
} from "@/components/ui/InterventionCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { groupInterventions, type PlanGroupKey } from "@/lib/plan-groups";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** One Feather icon per plan group, shown in the section title's orange square. */
const GROUP_ICONS: Record<PlanGroupKey, keyof typeof Feather.glyphMap> = {
  habits: "sun",
  food: "coffee",
  supplements: "droplet",
  followup: "refresh-cw",
  referrals: "user-check",
};

/**
 * Chips hold a short status only — a pill truncates anything longer than a
 * couple of words. The full review sentence stays on the item detail screen.
 */
function planChip(
  row: InterventionRow,
): { tone: InterventionTone; label: string } {
  if (row.clinician_interaction_check) {
    return { tone: "check", label: COPY.planNeedsCheck };
  }
  if (row.status === "clinician_approved" || row.status === "active") {
    return { tone: "approved", label: "Practitioner approved" };
  }
  return { tone: "pending", label: "Pending review" };
}

export default function PlanScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<InterventionRow[]>([]);

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

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const reviewed =
    reviewState === "approved_pending" || reviewState === "finalised";
  const showGroups = !loading && !message && rows.length > 0;
  const showEmpty = !loading && !message && rows.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Hero>
          <BackButton
            onPress={() => router.replace(routes.labResults)}
            accessibilityLabel={COPY.planBackResults}
          />
          <Text style={styles.heroTitle} accessibilityRole="header">
            {planTitle}
          </Text>
          <View style={styles.heroChip}>
            <Chip
              label={reviewed ? "Practitioner approved" : "Pending review"}
              tone={reviewed ? "green" : "neutral"}
            />
          </View>
        </Hero>

        <View style={styles.body}>
          <Card>
            <Text style={styles.banner}>{planBanner}</Text>
            <Text style={styles.bannerBody}>{COPY.planBody}</Text>
          </Card>

          {loading ? <StaticSkeleton rows={4} /> : null}

          {message ? (
            <Card style={styles.block}>
              <Text style={styles.error}>{message}</Text>
              <TextButton
                title={COPY.planRetry}
                onPress={() => void loadExisting()}
              />
            </Card>
          ) : null}

          {showEmpty ? (
            <Card style={styles.block}>
              <Text style={styles.emptyHeading}>{COPY.planEmptyHeading}</Text>
              <Text style={styles.emptyBody}>{COPY.planEmpty}</Text>
            </Card>
          ) : null}

          {showGroups
            ? grouped.map((group) => (
                <View key={group.key}>
                  <SectionTitle
                    title={group.label}
                    icon={GROUP_ICONS[group.key]}
                  />
                  <View style={styles.cardStack}>
                    {group.items.map((row) => {
                      const chip = planChip(row);
                      return (
                        <InterventionCard
                          key={row.id}
                          title={row.title}
                          why={
                            row.plain_reason?.trim() ||
                            COPY.planDetailNotInstruction
                          }
                          clinicalBasis={
                            row.clinical_basis?.trim() || row.trigger_finding
                          }
                          tone={chip.tone}
                          statusLabel={chip.label}
                          actionLabel={
                            group.key === "supplements"
                              ? COPY.planBrowseStore
                              : undefined
                          }
                          onAction={
                            group.key === "supplements"
                              ? () => router.push(routes.store)
                              : undefined
                          }
                          onPress={() => {
                            router.push(planItemHref(row.id));
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              ))
            : null}

          <View style={styles.footer}>
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
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Gap.screenBottom,
  },
  heroTitle: {
    ...typeStyle("hero"),
    marginTop: Space.lg,
    color: Colors.ink,
  },
  heroChip: {
    marginTop: Space.md,
  },
  body: {
    paddingHorizontal: Space.screenH,
    // Section 8: 40px between the hero and the first content.
    paddingTop: Gap.sections,
  },
  banner: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  bannerBody: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.muted,
  },
  block: {
    marginTop: Gap.cards,
  },
  cardStack: {
    gap: Gap.cards,
  },
  emptyHeading: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  emptyBody: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  footer: {
    marginTop: Gap.screenBottom,
  },
});
