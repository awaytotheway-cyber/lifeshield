import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import {
  computeDailyStreak,
  computeProgress,
  type Goal,
  type GoalProgressEntry,
  type GoalStatus,
} from "@/lib/goals";
import {
  loadGoalProgress,
  loadGoals,
  logGoalProgress,
  updateGoalStatus,
} from "@/lib/goals-io";
import { fontFamily, typography } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/** Failure and warning text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

type LoadState = "idle" | "loading" | "ready" | "error";

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;
  const goalId = typeof id === "string" ? id.trim() : "";

  const [state, setState] = useState<LoadState>("idle");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [entries, setEntries] = useState<GoalProgressEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [logValue, setLogValue] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !goalId) return;
    setState("loading");
    setErrorMessage(null);

    // No single-row loader in goals-io yet — list all and pick the one we
    // navigated to. RLS restricts the list to this user's own rows, so this
    // is a small read (dozens of rows at most in Phase A).
    const [goalsOutcome, progressOutcome] = await Promise.all([
      loadGoals(userId),
      loadGoalProgress(goalId),
    ]);

    if (!goalsOutcome.ok) {
      setErrorMessage(goalsOutcome.message);
      setState("error");
      return;
    }
    const found = goalsOutcome.rows.find((row) => row.id === goalId) ?? null;
    if (!found) {
      setErrorMessage("This goal wasn't found. It may have been archived.");
      setState("error");
      return;
    }
    setGoal(found);
    setEntries(progressOutcome.ok ? progressOutcome.rows : []);
    setState("ready");
  }, [userId, goalId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (!goalId) {
    return <Redirect href={routes.goals} />;
  }

  async function onLog() {
    if (!userId || !goal) return;
    const value = Number(logValue);
    if (!Number.isFinite(value) || value <= 0) {
      setLogError("Enter a positive number.");
      return;
    }
    setLogError(null);
    setLogging(true);
    const outcome = await logGoalProgress(userId, goal.id, value, logNote);
    setLogging(false);
    if (!outcome.ok) {
      setLogError(outcome.message);
      Alert.alert("Couldn't log progress", outcome.message);
      return;
    }
    setEntries((current) => [outcome.row, ...current]);
    setLogValue("");
    setLogNote("");
  }

  async function onSetStatus(next: GoalStatus) {
    if (!goal || statusBusy) return;
    setStatusBusy(true);
    const outcome = await updateGoalStatus(goal.id, next);
    setStatusBusy(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't update goal", outcome.message);
      return;
    }
    setGoal({ ...goal, status: next });
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Goal"
        onBack={() => router.replace(routes.goals)}
      />

      {state === "loading" ? (
        <ActivityIndicator color={colors.mossDeep} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <Surface style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't open this goal</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </Surface>
      ) : null}

      {state === "ready" && goal ? (
        <GoalBody
          goal={goal}
          entries={entries}
          logValue={logValue}
          setLogValue={setLogValue}
          logNote={logNote}
          setLogNote={setLogNote}
          logging={logging}
          logError={logError}
          onLog={onLog}
          statusBusy={statusBusy}
          onSetStatus={onSetStatus}
        />
      ) : null}
    </Screen>
  );
}

function GoalBody({
  goal,
  entries,
  logValue,
  setLogValue,
  logNote,
  setLogNote,
  logging,
  logError,
  onLog,
  statusBusy,
  onSetStatus,
}: {
  goal: Goal;
  entries: GoalProgressEntry[];
  logValue: string;
  setLogValue: (value: string) => void;
  logNote: string;
  setLogNote: (value: string) => void;
  logging: boolean;
  logError: string | null;
  onLog: () => void;
  statusBusy: boolean;
  onSetStatus: (next: GoalStatus) => void;
}) {
  const now = new Date();
  const progress = computeProgress(goal, entries, now);
  const streak = computeDailyStreak(goal, entries, now);
  const windowLabel =
    goal.target.cadence === "daily"
      ? "today"
      : goal.target.cadence === "weekly"
        ? "this week"
        : "so far";

  return (
    <>
      <Surface style={styles.summary}>
        <Text style={styles.cadence}>{cadenceLabel(goal.target.cadence)}</Text>
        <Text style={styles.title}>{goal.title}</Text>
        <Text style={styles.subtitle}>
          Target: {goal.target.value} {goal.target.unit} · started{" "}
          {goal.start_date}
          {goal.end_date ? ` · ends ${goal.end_date}` : ""}
        </Text>

        <ProgressBar current={progress.total} total={goal.target.value} />
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {progress.total}/{goal.target.value} {goal.target.unit} {windowLabel}
          </Text>
          <Text style={styles.metaText}>· {progress.percent}%</Text>
          {streak > 0 ? (
            <Text style={styles.metaText}>· {streak}-day streak</Text>
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusChip}>Status: {statusLabel(goal.status)}</Text>
          {goal.source_kind !== "self" ? (
            <Text style={styles.statusChip}>from {goal.source_kind}</Text>
          ) : null}
          {goal.clinician_reviewed ? (
            <Text style={[styles.statusChip, styles.reviewedChip]}>Reviewed</Text>
          ) : null}
        </View>
      </Surface>

      {goal.clinician_reviewed && goal.reviewer_note ? (
        <Surface style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>
            Reviewer note{goal.reviewed_by ? ` · ${goal.reviewed_by}` : ""}
          </Text>
          <Text style={styles.body}>{goal.reviewer_note}</Text>
        </Surface>
      ) : null}

      {goal.status === "active" ? (
        <Surface style={styles.formCard}>
          <Text style={styles.sectionHeading}>Log progress</Text>
          <TextInput
            label={`Amount (${goal.target.unit})`}
            placeholder="0"
            keyboardType="numeric"
            value={logValue}
            onChangeText={setLogValue}
            error={logError ?? undefined}
          />
          <TextInput
            label="Note (optional)"
            placeholder="How did it go?"
            value={logNote}
            onChangeText={setLogNote}
          />
          <PrimaryButton title="Log entry" loading={logging} onPress={onLog} />
        </Surface>
      ) : (
        <Surface style={styles.formCard}>
          <Text style={styles.sectionHeading}>Paused</Text>
          <Text style={styles.body}>
            Resume this goal to start logging progress again.
          </Text>
          <PrimaryButton
            title="Resume goal"
            loading={statusBusy}
            onPress={() => onSetStatus("active")}
          />
        </Surface>
      )}

      <View style={styles.actionRow}>
        {goal.status === "active" ? (
          <>
            <SecondaryButton
              title="Pause"
              disabled={statusBusy}
              onPress={() => onSetStatus("paused")}
            />
            <SecondaryButton
              title="Mark complete"
              disabled={statusBusy}
              onPress={() => onSetStatus("completed")}
            />
          </>
        ) : null}
        <DangerButton
          title="Archive"
          disabled={statusBusy}
          onPress={() =>
            Alert.alert(
              "Archive this goal?",
              "It won't show in your active list. You can still find it under Paused & completed.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Archive",
                  style: "destructive",
                  onPress: () => onSetStatus("archived"),
                },
              ],
            )
          }
        />
      </View>

      <Text style={styles.sectionHeading}>Recent entries</Text>
      {entries.length === 0 ? (
        <Text style={styles.body}>
          Nothing logged yet. Each entry counts toward the {windowLabel}{" "}
          progress bar above.
        </Text>
      ) : (
        <FlatList
          data={entries}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryRow entry={item} unit={goal.target.unit} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </>
  );
}

function EntryRow({
  entry,
  unit,
}: {
  entry: GoalProgressEntry;
  unit: string;
}) {
  const when = new Date(entry.recorded_at);
  const label = Number.isNaN(when.getTime())
    ? entry.recorded_at
    : when.toLocaleString();
  return (
    <Surface>
      <Text style={styles.entryValue}>
        {entry.value} {unit}
      </Text>
      <Text style={styles.entryWhen}>{label}</Text>
      {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
    </Surface>
  );
}

function cadenceLabel(cadence: "daily" | "weekly" | "once"): string {
  if (cadence === "daily") return "Daily";
  if (cadence === "weekly") return "Weekly";
  return "One-off";
}

function statusLabel(status: GoalStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: spacing.md,
  },
  errorCard: {
    marginTop: spacing.md,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: CLAY,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  summary: {
    marginTop: spacing.md,
  },
  cadence: {
    marginBottom: spacing.micro,
    // The system's eyebrow: 11px micro-caps in `inkMuted`. A 12px
    // uppercase moss line was a fourth label style and read as a link.
    ...typography.micro,
    color: colors.inkMuted,
  },
  // The card title, on the scale: 20, not a one-off 22.
  title: {
    marginBottom: spacing.micro,
    ...typography.title,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
    marginTop: spacing.sm,
  },
  metaText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusChip: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  reviewedChip: {
    // The chip's own text tone. White on the pale `withinRange`
    // fill was invisible.
    color: status.withinRange.text,
    backgroundColor: status.withinRange.fill,
  },
  reviewCard: {
    marginTop: spacing.sm,
  },
  reviewLabel: {
    marginBottom: spacing.micro,
    // The system's eyebrow: 11px micro-caps in `inkMuted`. A 12px
    // uppercase moss line was a fourth label style and read as a link.
    ...typography.micro,
    color: colors.inkMuted,
  },
  formCard: {
    marginTop: spacing.md,
  },
  // A section header is an 11px micro-caps label, not an 18px bold title:
  // a column of those is what made short section names read as one block.
  // `inkMuted`, not `inkFaint` — at 11px only inkMuted clears AA.
  sectionHeading: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    ...typography.micro,
    color: colors.inkMuted,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  entryValue: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.ink,
  },
  entryWhen: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: spacing.micro,
  },
  entryNote: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.ink,
    marginTop: spacing.sm,
  },
});
