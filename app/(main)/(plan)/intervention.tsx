import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { Button, SecondaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { interventionToGoalPrefill } from "@/lib/goals";
import {
  countDoneInLast7Days,
  loadInterventionProgress,
  logInterventionProgress,
  type InterventionProgressEntry,
} from "@/lib/intervention-progress";
import {
  loadTemplateForTriggerFinding,
  type ActionStep,
  type InterventionTemplate,
  type Resource,
} from "@/lib/intervention-templates";
import { termKeyForFinding } from "@/lib/plan-groups";
import {
  loadOwnInterventionById,
  reviewStatusLabel,
  type InterventionRow,
} from "@/lib/plan";
import { interventionToReminderPrefill } from "@/lib/reminders";
import {
  goalsNewFromInterventionHref,
  remindersNewFromInterventionHref,
  routes,
} from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);
  const [template, setTemplate] = useState<InterventionTemplate | null>(null);
  const [progress, setProgress] = useState<InterventionProgressEntry[]>([]);
  const [loggingDone, setLoggingDone] = useState(false);

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

  // Feature flags — reads profile.feature_flags once per mount. The CTAs and
  // Phase B sections stay hidden while this resolves (compile-time defaults).
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !isSupabaseConfigured) {
      return;
    }
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

  const goalsEnabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.goals_v1
      : isFeatureEnabled(profile, "goals_v1");
  const remindersEnabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.reminders_v1
      : isFeatureEnabled(profile, "reminders_v1");
  const planV2Enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.plan_v2
      : isFeatureEnabled(profile, "plan_v2");
  const testBookingEnabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.test_booking_v1
      : isFeatureEnabled(profile, "test_booking_v1");

  // Phase B: look up the matching template for this intervention's finding
  // and the progress log. Only when plan_v2 is on — the pre-Phase-B render
  // path is unchanged.
  useEffect(() => {
    if (!row || !planV2Enabled) {
      setTemplate(null);
      return;
    }
    let cancelled = false;
    void loadTemplateForTriggerFinding(row.trigger_finding).then((outcome) => {
      if (cancelled) return;
      setTemplate(outcome.ok ? outcome.template : null);
    });
    return () => {
      cancelled = true;
    };
  }, [row, planV2Enabled]);

  useEffect(() => {
    if (!row || !planV2Enabled) {
      setProgress([]);
      return;
    }
    let cancelled = false;
    void loadInterventionProgress(row.id).then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) setProgress(outcome.rows);
    });
    return () => {
      cancelled = true;
    };
  }, [row, planV2Enabled]);

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

  async function onLogDone() {
    if (!row || !session?.user.id || loggingDone) return;
    setLoggingDone(true);
    const outcome = await logInterventionProgress(
      row.id,
      session.user.id,
      { done: true },
      null,
    );
    setLoggingDone(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't log progress", outcome.message);
      return;
    }
    setProgress((current) => [outcome.row, ...current]);
  }

  return (
    <Screen scroll>
      <Text className="text-center text-2xl text-charcoal">
        {COPY.planDetailTitle}
      </Text>
      <View className="mt-4 rounded-xl border border-teal bg-white px-4 py-3">
        <Text className="text-center text-charcoal">{bannerText}</Text>
      </View>

      {loading ? (
        <ActivityIndicator className="mt-6" color="#1A535C" />
      ) : null}

      {message ? (
        <>
          <Text className="mt-4 text-center text-coral">{message}</Text>
          <Button
            title={COPY.planRetry}
            variant="ghost"
            onPress={() => {
              void refresh();
            }}
          />
        </>
      ) : null}

      {!loading && !message && row ? (
        <>
          <Text className="mt-4 text-center text-xl text-charcoal">
            {row.title}
          </Text>
          <Text className="mt-4 text-sm text-teal">{COPY.planDetailWhat}</Text>
          <Text className="mt-1 text-charcoal">
            {row.description?.trim() ||
              row.plain_reason?.trim() ||
              COPY.planDetailNotInstruction}
          </Text>
          <Text className="mt-4 text-sm text-teal">{COPY.planWhyLabel}</Text>
          <Text className="mt-1 text-charcoal">
            {row.plain_reason?.trim() || COPY.planDetailNotInstruction}
          </Text>

          {row.clinician_interaction_check ? (
            <View
              className="mt-3 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: "#FDE68A" }}
            >
              <Text className="text-sm text-charcoal">{COPY.planNeedsCheck}</Text>
            </View>
          ) : null}

          {planV2Enabled && template ? (
            <TemplateSection template={template} />
          ) : null}

          <Text className="mt-4 text-sm text-teal">{COPY.planDetailReview}</Text>
          <Text className="mt-1 text-charcoal">
            {reviewStatusLabel(row.status)}
          </Text>

          {/*
            Action row for the Phase A/B CTAs. Each is independently flag-gated
            so an account can hold e.g. goals but not reminders.
          */}
          <View className="mt-4" style={{ gap: 8 }}>
            {goalsEnabled ? (
              <SecondaryButton
                title="Set a goal for this"
                onPress={() => {
                  const prefill = interventionToGoalPrefill({
                    id: row.id,
                    category: String(row.category),
                    title: row.title,
                  });
                  router.push(goalsNewFromInterventionHref(prefill));
                }}
              />
            ) : null}
            {remindersEnabled ? (
              <SecondaryButton
                title="Remind me about this"
                onPress={() => {
                  const prefill = interventionToReminderPrefill({
                    id: row.id,
                    category: String(row.category),
                    title: row.title,
                  });
                  router.push(remindersNewFromInterventionHref(prefill));
                }}
              />
            ) : null}
            {/*
              Book-a-test CTA — only shown for referral-category interventions,
              since that's the class of recommendation the booking screen
              covers. The screen itself lets the user pick which recommended
              test to book; we deep-link with no test preselection because
              interventions.trigger_finding and test_orders.test_name don't
              have a stable mapping today.
            */}
            {testBookingEnabled && String(row.category) === "referral" ? (
              <SecondaryButton
                title="Book a test"
                onPress={() => {
                  router.push(routes.ordersBook);
                }}
              />
            ) : null}
          </View>

          {planV2Enabled ? (
            <ProgressSection
              entries={progress}
              onLogDone={onLogDone}
              busy={loggingDone}
            />
          ) : null}

          <Text className="mt-4 text-sm text-teal">{COPY.planClinicalBasis}</Text>
          <Text className="mt-1 text-charcoal">
            {row.clinical_basis?.trim() || row.trigger_finding}
          </Text>

          <Text className="mt-6 text-center text-sm text-teal">
            {COPY.planDetailFinding}
          </Text>
          <ClinicalTerm
            termKey={termKey}
            plainName={row.title}
            plainExplanation={row.plain_reason ?? undefined}
            medicalName={row.trigger_finding}
          />

          <Text className="mt-4 text-center text-sm text-teal">
            {COPY.planDetailNotInstruction}
          </Text>
        </>
      ) : null}

      <Button
        title={COPY.planDetailBack}
        onPress={() => {
          router.replace(routes.plan);
        }}
      />
    </Screen>
  );
}

function TemplateSection({ template }: { template: InterventionTemplate }) {
  const steps: ActionStep[] = Array.isArray(template.action_steps)
    ? (template.action_steps as ActionStep[])
    : [];
  const resources: Resource[] = Array.isArray(template.resources)
    ? (template.resources as Resource[])
    : [];

  return (
    <View className="mt-4">
      {template.rationale_md ? (
        <>
          <Text className="text-sm text-teal">Why this helps</Text>
          <Text className="mt-1 text-charcoal">{template.rationale_md}</Text>
        </>
      ) : null}

      {steps.length > 0 ? (
        <>
          <Text className="mt-4 text-sm text-teal">Action steps</Text>
          {steps.map((step, index) => (
            <View key={index} className="mt-2">
              <Text className="text-charcoal">• {step.text}</Text>
              {step.dose || step.when ? (
                <Text className="ml-3 text-sm text-teal">
                  {[step.dose, step.when].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {step.why ? (
                <Text className="ml-3 text-sm text-charcoal">{step.why}</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}

      {resources.length > 0 ? (
        <>
          <Text className="mt-4 text-sm text-teal">Resources</Text>
          {resources.map((resource, index) => (
            <Pressable
              key={index}
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(resource.url).catch(() => {
                  // Silent — nothing crashes if the URL can't open.
                });
              }}
              className="mt-2"
            >
              <Text className="text-charcoal underline">{resource.title}</Text>
              <Text className="text-sm text-teal">{resource.kind}</Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

function ProgressSection({
  entries,
  onLogDone,
  busy,
}: {
  entries: InterventionProgressEntry[];
  onLogDone: () => void;
  busy: boolean;
}) {
  const done7 = countDoneInLast7Days(entries);
  const recent = entries.slice(0, 5);
  return (
    <View className="mt-4">
      <Text className="text-sm text-teal">Your progress</Text>
      <Text className="mt-1 text-charcoal">
        {done7 === 0
          ? "No entries in the last 7 days."
          : `${done7} ${done7 === 1 ? "day" : "days"} logged in the last 7.`}
      </Text>
      <View className="mt-3">
        <SecondaryButton
          title="Log done today"
          loading={busy}
          onPress={onLogDone}
        />
      </View>
      {recent.length > 0 ? (
        <View className="mt-3">
          {recent.map((entry) => (
            <Text key={entry.id} className="text-sm text-charcoal">
              • {new Date(entry.recorded_at).toLocaleString()}
              {entry.note ? ` — ${entry.note}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
