import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { BarriersAccordion } from "@/components/ui/BarriersAccordion";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { termKeyForFinding } from "@/lib/plan-groups";
import {
  loadOwnInterventionById,
  reviewStatusLabel,
  type InterventionRow,
} from "@/lib/plan";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export default function PlanItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [row, setRow] = useState<InterventionRow | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    const itemId = typeof id === "string" ? id.trim() : "";
    if (!itemId) {
      setRow(null);
      setMessage(COPY.planDetailMissing);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await loadOwnInterventionById(session.user.id, itemId);
      if (!result.ok) {
        setMessage(result.message);
        setRow(null);
      } else if (result.rows.length === 0) {
        setMessage(COPY.planDetailMissing);
        setRow(null);
      } else {
        setRow(result.rows[0]);
        setMessage(null);
      }
    } catch {
      setMessage(COPY.planDetailLoadFailed);
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, id]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void refresh();
  }, [session?.user.id, refresh]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const termKey = row ? termKeyForFinding(row.trigger_finding) : undefined;
  const bannerText = row
    ? row.status === "active"
      ? COPY.planBannerFinalised
      : row.status === "clinician_approved"
        ? COPY.planBannerApproved
        : COPY.planBanner
    : COPY.planBanner;

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.planDetailTitle}
        onBack={() => router.replace(routes.plan)}
        backLabel={COPY.planDetailBack}
      />

      <Card>
        <Text style={styles.banner}>{bannerText}</Text>
      </Card>

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={Colors.orange} />
      ) : null}

      {message ? (
        <Card style={styles.block}>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.planRetry}
            onPress={() => {
              void refresh();
            }}
          />
        </Card>
      ) : null}

      {!loading && !message && row ? (
        <>
          <Card style={styles.block}>
            <Text style={styles.itemTitle}>{row.title}</Text>
            {row.clinician_interaction_check ? (
              <View style={styles.flag}>
                <Chip label={COPY.planNeedsCheck} tone="amber" />
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>{COPY.planDetailWhat}</Text>
            <Text style={styles.fieldValue}>
              {row.description?.trim() ||
                row.plain_reason?.trim() ||
                COPY.planDetailNotInstruction}
            </Text>

            <Text style={styles.fieldLabel}>{COPY.planWhyLabel}</Text>
            <Text style={styles.fieldValue}>
              {row.plain_reason?.trim() || COPY.planDetailNotInstruction}
            </Text>

            <Text style={styles.fieldLabel}>{COPY.planDetailReview}</Text>
            <Text style={styles.fieldValue}>{reviewStatusLabel(row.status)}</Text>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>{COPY.planClinicalBasis}</Text>
            <Text style={styles.fieldValue}>
              {row.clinical_basis?.trim() || row.trigger_finding}
            </Text>
          </Card>

          <Text style={styles.findingLabel}>{COPY.planDetailFinding}</Text>
          <ClinicalTerm
            termKey={termKey}
            plainName={row.title}
            plainExplanation={row.plain_reason ?? undefined}
            medicalName={row.trigger_finding}
          />

          <Text style={styles.disclaimer}>
            {COPY.planDetailNotInstruction}
          </Text>

          {session?.user.id ? (
            <BarriersAccordion
              userId={session.user.id}
              category={row.category as any}
              sourceType="intervention"
              sourceId={row.id}
            />
          ) : null}
        </>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          title={COPY.planDetailBack}
          onPress={() => {
            router.replace(routes.plan);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  spinner: {
    marginTop: Gap.cards,
  },
  block: {
    marginTop: Gap.cards,
  },
  itemTitle: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  flag: {
    marginTop: Space.sm,
  },
  fieldLabel: {
    ...typeStyle("label"),
    marginTop: Space.lg,
    color: Colors.muted,
  },
  fieldValue: {
    ...typeStyle("body"),
    marginTop: Gap.labelToField,
    color: Colors.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginTop: Space.lg,
  },
  findingLabel: {
    ...typeStyle("label"),
    marginTop: Gap.sections,
    color: Colors.muted,
  },
  disclaimer: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.muted,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
