import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
  const due = dueLabel(row.due_date);
  const dueToday = due === COPY.followUpDueToday;
  return (
    <Card>
      <View style={styles.cardTop}>
        <Chip label={typeLabel(row.type)} />
        <Chip label={due} tone={dueToday ? "amber" : "neutral"} />
      </View>
      <Text style={styles.cardTitle}>{row.title}</Text>
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
    </Card>
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

  const reminderNote = reminderStatus ? reminderNoteFor(reminderStatus) : null;
  const pushNote = pushRegistrationNoteFor(pushStatus);

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.followUpTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.followUpBackHome}
      />

      <Card>
        <Text style={styles.body}>{COPY.followUpBody}</Text>
      </Card>

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <Card style={styles.block}>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.followUpRetry}
            onPress={() => void loadList()}
          />
        </Card>
      ) : null}

      {showEmpty ? (
        <>
          <Card style={styles.block}>
            <Text style={styles.emptyHeading}>{COPY.followUpEmptyHeading}</Text>
            <Text style={styles.emptyBody}>{COPY.followUpEmpty}</Text>
          </Card>
          <PrimaryButton
            title={COPY.followUpSeedNow}
            onPress={() => {
              void loadList();
            }}
          />
        </>
      ) : null}

      {showList && pending.length > 0 ? (
        <View style={styles.cardStack}>
          {pending.map((item) => (
            <FollowUpCard
              key={item.id}
              row={item}
              busyId={busyId}
              onComplete={() => {
                void markDone(item.id);
              }}
            />
          ))}
        </View>
      ) : null}

      {loadState !== "loading" ? (
        <Card style={styles.remindersCard}>
          {reminderNote === null ? (
            <>
              <Text style={styles.body}>{COPY.followUpRemindersAsk}</Text>
              <TextButton
                title={COPY.followUpRemindersAllow}
                loading={askingReminders}
                onPress={() => {
                  void askReminders();
                }}
              />
              {isExpoGo() ? (
                <Text style={styles.note}>
                  {pushRegistrationNoteFor("expo_go")}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.ok}>{reminderNote}</Text>
              {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}
            </>
          )}
        </Card>
      ) : null}

      <View style={styles.footer}>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  block: {
    marginTop: Gap.cards,
  },
  cardStack: {
    marginTop: Gap.sections,
    gap: Gap.cards,
  },
  cardTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.sm,
  },
  cardTitle: {
    ...typeStyle("cardTitle"),
    marginTop: Space.md,
    color: Colors.ink,
  },
  note: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.muted,
  },
  hint: {
    ...typeStyle("body"),
    marginTop: Space.md,
    color: Colors.body,
  },
  ok: {
    ...typeStyle("body"),
    color: Colors.green,
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
  remindersCard: {
    marginTop: Gap.sections,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
