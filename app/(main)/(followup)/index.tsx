import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  reminderNoteFor,
  requestFollowUpReminderPermission,
  syncLocalFollowUpReminders,
  type ReminderPermission,
} from "@/lib/follow-up-reminders";
import {
  isExpoGo,
  pushRegistrationNoteFor,
  registerForPushNotifications,
  type PushRegistrationStatus,
} from "@/lib/push-notifications";
import {
  completeFollowUp,
  firstPendingSymptom,
  seedFollowUpsIfNeeded,
  typeLabel,
  upcomingPending,
  type FollowUpRow,
} from "@/lib/follow-ups";
import { followUpSymptomHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

type HubLoadState = "idle" | "loading" | "ready" | "error";

function dueLabel(dueDate: string): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayIso = `${year}-${month}-${day}`;
  if (dueDate <= todayIso) {
    return COPY.followUpDueToday;
  }
  return `${COPY.followUpDueOn} ${dueDate}`;
}

function FollowUpCard({
  row,
  busyId,
  onComplete,
}: {
  row: FollowUpRow;
  busyId: string | null;
  onComplete: () => void;
}) {
  const isSymptom = row.type === "symptom_check";
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{typeLabel(row.type)}</Text>
      <Text style={styles.cardTitle}>{row.title}</Text>
      <Text style={styles.due}>{dueLabel(row.due_date)}</Text>
      {row.plain_note ? <Text style={styles.note}>{row.plain_note}</Text> : null}
      {isSymptom ? (
        <Text style={styles.hint}>{COPY.followUpDoSymptom}</Text>
      ) : (
        <TextButton
          title={COPY.followUpMarkDone}
          loading={busyId === row.id}
          disabled={Boolean(busyId)}
          onPress={onComplete}
        />
      )}
    </View>
  );
}

export default function FollowUpHubScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loadState, setLoadState] = useState<HubLoadState>("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [reminderStatus, setReminderStatus] =
    useState<ReminderPermission | null>(null);
  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus | null>(
    null,
  );
  const [askingReminders, setAskingReminders] = useState(false);

  const loadList = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setLoadState("error");
      setMessage(COPY.followUpLoadFailed);
      setRows([]);
      return;
    }

    setLoadState("loading");
    setMessage(null);
    try {
      const result = await seedFollowUpsIfNeeded(userId, "hub");
      if (!result.ok) {
        setLoadState("error");
        setMessage(result.message);
        setRows([]);
        return;
      }
      setLoadState("ready");
      setMessage(null);
      setRows(result.rows);
      void syncLocalFollowUpReminders(result.rows);
      if (isExpoGo()) {
        setPushStatus("expo_go");
      }
    } catch {
      setLoadState("error");
      setMessage(COPY.followUpLoadFailed);
      setRows([]);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void loadList();
  }, [session?.user.id, loadList]);

  const pending = upcomingPending(rows);
  const symptom = firstPendingSymptom(rows);
  const loading = loadState === "loading";
  const showList = loadState === "ready" && !message;
  const showEmpty = showList && pending.length === 0;

  const markDone = async (id: string) => {
    if (!session?.user.id) {
      return;
    }
    setBusyId(id);
    try {
      const result = await completeFollowUp(session.user.id, id);
      if (!result.ok) {
        setMessage(result.message);
        setLoadState("error");
        return;
      }
      await loadList();
    } catch {
      setMessage(COPY.followUpSaveFailed);
      setLoadState("error");
    } finally {
      setBusyId(null);
    }
  };

  const askReminders = async () => {
    setAskingReminders(true);
    try {
      const status = await requestFollowUpReminderPermission();
      setReminderStatus(status);
      if (status === "granted") {
        void syncLocalFollowUpReminders(rows);
        if (session?.user.id) {
          const push = await registerForPushNotifications(session.user.id);
          setPushStatus(push.ok ? push.status : push.status);
        }
      }
    } catch {
      setReminderStatus("unavailable");
    } finally {
      setAskingReminders(false);
    }
  };

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
        title={COPY.followUpTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.followUpBackHome}
      />
      <Text style={styles.body}>{COPY.followUpBody}</Text>

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.followUpRetry} onPress={() => void loadList()} />
        </>
      ) : null}

      {showEmpty ? (
        <>
          <EmptyState
            icon="check-circle"
            heading={COPY.followUpEmptyHeading}
            explanation={COPY.followUpEmpty}
          />
          <PrimaryButton
            title={COPY.followUpSeedNow}
            onPress={() => {
              void loadList();
            }}
          />
        </>
      ) : null}

      {showList ? (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FollowUpCard
              row={item}
              busyId={busyId}
              onComplete={() => {
                void markDone(item.id);
              }}
            />
          )}
          contentContainerStyle={styles.list}
        />
      ) : null}

      {loadState !== "loading" && reminderStatus === null ? (
        <>
          <Text style={styles.body}>{COPY.followUpRemindersAsk}</Text>
          <TextButton
            title={COPY.followUpRemindersAllow}
            loading={askingReminders}
            onPress={() => {
              void askReminders();
            }}
          />
        </>
      ) : loadState !== "loading" && reminderStatus !== null ? (
        <>
          <Text style={styles.ok}>{reminderNoteFor(reminderStatus)}</Text>
          {pushRegistrationNoteFor(pushStatus) ? (
            <Text style={styles.note}>{pushRegistrationNoteFor(pushStatus)}</Text>
          ) : null}
        </>
      ) : null}

      {loadState !== "loading" && isExpoGo() && reminderStatus === null ? (
        <Text style={styles.note}>{pushRegistrationNoteFor("expo_go")}</Text>
      ) : null}

      {symptom && showList ? (
        <PrimaryButton
          title={COPY.followUpDoSymptom}
          onPress={() => {
            router.push(followUpSymptomHref(symptom.id));
          }}
        />
      ) : (
        <PrimaryButton
          title={COPY.followUpBackHome}
          disabled={loading}
          onPress={() => {
            router.replace(routes.home);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: 8,
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
  ok: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.sage,
    textAlign: "center",
  },
  note: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
    textAlign: "center",
  },
  hint: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.midTeal,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    ...shadows.card,
  },
  type: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
  },
  cardTitle: {
    marginTop: 4,
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  due: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.charcoal,
  },
});
