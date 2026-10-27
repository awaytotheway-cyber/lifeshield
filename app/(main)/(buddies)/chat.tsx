import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { MessageBubble } from "@/components/buddies/MessageBubble";
import { SafetyStrip } from "@/components/buddies/SafetyStrip";
import { DangerButton, IconButton, SecondaryButton } from "@/components/ui/Button";
import { InitialDisc } from "@/components/ui/InitialDisc";
import { Screen } from "@/components/ui/Screen";
import { Toast } from "@/components/ui/Toast";
import {
  blockUser,
  canMessage,
  connectionStatusFor,
  describeBuddy,
  displayNameFrom,
  loadBuddyProfiles,
  loadMyConnections,
  reportUser,
  type BuddyProfile,
  type Connection,
} from "@/lib/buddies";
import {
  groupByDay,
  isMine,
  loadThread,
  MAX_MESSAGE_LENGTH,
  sendMessage,
  subscribeToThread,
  validateMessage,
  type ChatMessage,
} from "@/lib/chat";
import { pad2 } from "@/lib/datetime";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

/** Verbatim. See components/buddies/SafetyStrip.tsx. */
const SAFETY = "Results and reports are never shared in chat.";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Which step of the options sheet is showing. `null` is closed. */
type SheetMode = "menu" | "block" | "report" | null;

/**
 * With no Supabase configured there is no profile to read, so the flag falls
 * to its shipped default (false). Derived rather than written into state.
 */
const OFFLINE_FLAGS: FeatureFlagProfile = { feature_flags: {} };

/** `"08:14"`, in the device's own timezone — the same clock the day grouping uses. */
function clockTime(iso: string): string {
  const at = Date.parse(iso ?? "");
  if (!Number.isFinite(at)) return "";
  const date = new Date(at);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "Buddy since August", or "" when the date will not parse. */
function buddySince(iso: string): string {
  const at = Date.parse(iso ?? "");
  if (!Number.isFinite(at)) return "";
  const month = MONTHS[new Date(at).getMonth()];
  return month ? `Buddy since ${month}` : "";
}

/**
 * One buddy thread.
 *
 * Block and Report are both two taps from here — the overflow button, then the
 * row — because no social surface ships without them. Block is symmetric in
 * the database: once the row exists, discovery, the connection and the
 * messages all stop resolving in both directions, which is why this screen
 * leaves for the buddies list immediately afterwards rather than sitting on a
 * thread it can no longer read.
 *
 * There is no "delivered", no "read" and no typing indicator. `chat_messages`
 * has no read_at column and the product has no presence channel, so each of
 * those would be a drawn claim with nothing behind it.
 */
export default function BuddyChatScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const params = useLocalSearchParams<{
    connectionId?: string;
    buddyId?: string;
    name?: string;
  }>();
  const connectionId = (params.connectionId ?? "").trim();
  const buddyId = (params.buddyId ?? "").trim();
  const passedName = (params.name ?? "").trim();

  const [fetchedFlags, setFetchedFlags] = useState<FeatureFlagProfile | null>(
    null,
  );
  const [connection, setConnection] = useState<Connection | null>(null);
  const [buddy, setBuddy] = useState<BuddyProfile | null>(null);
  const [connectionLoaded, setConnectionLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const scroller = useRef<ScrollView | null>(null);

  /** Insert or replace by id, keeping the thread oldest-first. */
  const absorb = useCallback((incoming: ChatMessage[]) => {
    setMessages((previous) => {
      const byId = new Map(previous.map((row) => [row.id, row]));
      for (const row of incoming) byId.set(row.id, row);
      return [...byId.values()].sort(
        (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
      );
    });
  }, []);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("feature_flags")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setFetchedFlags((data ?? { feature_flags: {} }) as FeatureFlagProfile);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flagProfile = isSupabaseConfigured ? fetchedFlags : OFFLINE_FLAGS;

  const enabled =
    flagProfile === null
      ? FEATURE_FLAG_DEFAULTS.social_v1
      : isFeatureEnabled(flagProfile, "social_v1");

  /**
   * The connection and the buddy's three shareable fields. The connection is
   * re-read rather than trusted from the params: the status decides whether
   * the composer exists, and a blocked or declined connection stops being
   * readable at all, which is the honest cue that the thread is gone.
   */
  useEffect(() => {
    if (!userId || !enabled || connectionId.length === 0) return;
    let cancelled = false;
    void (async () => {
      const outcome = await loadMyConnections();
      if (cancelled) return;
      if (!outcome.ok) {
        setErrorMessage(outcome.message);
        setConnectionLoaded(true);
        return;
      }
      setConnection(outcome.rows.find((row) => row.id === connectionId) ?? null);
      setConnectionLoaded(true);

      if (buddyId.length > 0) {
        const profiles = await loadBuddyProfiles([buddyId]);
        if (cancelled) return;
        setBuddy(profiles.rows[0] ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, enabled, connectionId, buddyId]);

  /** The thread, then live inserts on it. */
  useEffect(() => {
    if (!userId || !enabled || connectionId.length === 0) return;
    let cancelled = false;
    void loadThread(connectionId).then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) {
        absorb(outcome.rows);
      } else {
        setErrorMessage(outcome.message);
      }
    });
    // subscribeToThread has no error channel: if realtime is off or the
    // channel cannot open it stays silent, and new messages then arrive only
    // on the next load. Accepted as-is — a "reconnecting" badge would need a
    // status callback this library does not expose, and inventing one here
    // would mean a second subscription implementation.
    const unsubscribe = subscribeToThread(connectionId, (message) => {
      if (cancelled) return;
      absorb([message]);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, enabled, connectionId, absorb]);

  const days = useMemo(() => groupByDay(messages), [messages]);

  const name = buddy?.display_name || passedName || displayNameFrom(null, null);
  const described = buddy ? describeBuddy(buddy) : "";
  const view = useMemo(
    () =>
      connection && userId ? connectionStatusFor(connection, userId) : "none",
    [connection, userId],
  );

  const subtitle = useMemo(() => {
    if (view === "incoming_request") return "Wants to be your buddy";
    if (view === "outgoing_request") return "Request sent — not accepted yet";
    if (view !== "active" || !connection) return described;
    const since = buddySince(connection.created_at);
    return [since, described].filter((part) => part.length > 0).join(" · ");
  }, [view, connection, described]);

  const valid = validateMessage(draft).ok;
  const open = canMessage(connection);

  const onSend = () => {
    if (!valid || sending) return;
    setSending(true);
    void sendMessage(connectionId, draft).then((outcome) => {
      setSending(false);
      if (!outcome.ok) {
        setErrorMessage(outcome.message);
        return;
      }
      setDraft("");
      setErrorMessage(null);
      // Re-read rather than appending a guessed row: the insert's id and
      // server timestamp are what the day grouping and the dedupe key use.
      void loadThread(connectionId).then((reloaded) => {
        if (reloaded.ok) absorb(reloaded.rows);
      });
    });
  };

  const onBlock = () => {
    if (busy || buddyId.length === 0) return;
    setBusy(true);
    void blockUser(buddyId).then((outcome) => {
      setBusy(false);
      setSheet(null);
      if (!outcome.ok) {
        setErrorMessage(outcome.message);
        return;
      }
      // The thread is unreadable from this moment in both directions, so
      // staying on it would show a frozen copy of a conversation that no
      // longer exists.
      router.replace(routes.buddies);
    });
  };

  const onReport = () => {
    if (busy || buddyId.length === 0) return;
    setBusy(true);
    void reportUser("user", buddyId, reason).then((outcome) => {
      setBusy(false);
      if (!outcome.ok) {
        setErrorMessage(outcome.message);
        return;
      }
      setSheet(null);
      setReason("");
      setToast("Report sent. Our team will look at it.");
    });
  };

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="arrow-left"
        accessibilityLabel="Back to buddies"
        onPress={() => router.replace(routes.buddies)}
        style={styles.headerBack}
      />
      <InitialDisc name={name} size={40} />
      <View style={styles.headerText}>
        <Text style={styles.headerName} numberOfLines={1}>
          {name}
        </Text>
        {subtitle.length > 0 ? (
          <Text style={styles.headerMeta} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {enabled ? (
        <IconButton
          icon="more-vertical"
          accessibilityLabel="Chat options"
          onPress={() => setSheet("menu")}
          style={styles.headerMore}
        />
      ) : null}
    </View>
  );

  if (!enabled) {
    return (
      <Screen header={header} contentPadding={spacing.screenX}>
        <Text style={styles.notice}>
          Buddies is switched off for your account while we test it with a
          small group.
        </Text>
      </Screen>
    );
  }

  const footer = open ? (
    <View style={styles.composer}>
      <RNTextInput
        accessibilityLabel={`Message ${name}`}
        placeholder={`Message ${name}`}
        placeholderTextColor={colors.inkMuted}
        value={draft}
        onChangeText={setDraft}
        maxLength={MAX_MESSAGE_LENGTH}
        multiline={false}
        returnKeyType="send"
        onSubmitEditing={onSend}
        style={styles.composerInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !valid || sending }}
        disabled={!valid || sending}
        onPress={onSend}
        style={[styles.send, valid && !sending ? null : styles.sendOff]}
      >
        <Feather
          name="arrow-right"
          size={20}
          color={valid && !sending ? colors.white : colors.inkMuted}
        />
      </Pressable>
    </View>
  ) : (
    <Text style={styles.closedNote}>
      {view === "incoming_request"
        ? `Accept ${name}'s request on your buddies list to start chatting.`
        : view === "outgoing_request"
          ? `You can message ${name} once they accept your request.`
          : connectionLoaded
            ? "This conversation isn't available any more."
            : ""}
    </Text>
  );

  return (
    <Screen header={header} footer={footer} contentPadding={spacing.screenX}>
      <ScrollView
        ref={scroller}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() =>
          scroller.current?.scrollToEnd({ animated: false })
        }
        keyboardShouldPersistTaps="handled"
      >
        {days.map((day) => (
          <View key={day.day} style={styles.day}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            {day.messages.map((message) => (
              <MessageBubble
                key={message.id}
                body={message.body}
                time={clockTime(message.created_at)}
                mine={isMine(message, userId ?? "")}
              />
            ))}
          </View>
        ))}

        {messages.length === 0 && open ? (
          <Text style={styles.notice}>
            No messages yet. Say hello — a first line is usually enough.
          </Text>
        ) : null}

        <View style={styles.safety}>
          <SafetyStrip text={SAFETY} tone="moss" />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </ScrollView>

      <Modal
        visible={sheet !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)}>
          <Pressable onPress={() => undefined}>
            <View style={styles.sheet}>
              <SafeAreaView edges={["bottom"]}>
                {sheet === "menu" ? (
                  <>
                    <Text style={styles.sheetTitle}>Chat options</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSheet("block")}
                      style={styles.sheetRow}
                    >
                      <Feather name="slash" size={18} color={colors.ink} />
                      <Text style={styles.sheetRowText}>Block</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSheet("report")}
                      style={styles.sheetRow}
                    >
                      <Feather name="flag" size={18} color={colors.ink} />
                      <Text style={styles.sheetRowText}>Report</Text>
                    </Pressable>
                  </>
                ) : null}

                {sheet === "block" ? (
                  <>
                    <Text style={styles.sheetTitle}>Block {name}?</Text>
                    <Text style={styles.sheetBody}>
                      They won&apos;t be able to find you, message you, or open
                      this chat — and you won&apos;t see them in search either.
                      This works both ways and stays until you unblock them.
                    </Text>
                    <DangerButton
                      title="Block"
                      loading={busy}
                      disabled={busy}
                      onPress={onBlock}
                    />
                  </>
                ) : null}

                {sheet === "report" ? (
                  <>
                    <Text style={styles.sheetTitle}>Report {name}</Text>
                    <Text style={styles.sheetBody}>
                      Tell us what happened. Our team reads every report; the
                      person is not told that you sent one.
                    </Text>
                    <RNTextInput
                      accessibilityLabel="What went wrong"
                      placeholder="What went wrong?"
                      placeholderTextColor={colors.inkMuted}
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      style={styles.reasonInput}
                    />
                    <SecondaryButton
                      title="Send report"
                      loading={busy}
                      disabled={busy || reason.trim().length === 0}
                      onPress={onReport}
                    />
                  </>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSheet(sheet === "menu" ? null : "menu")}
                  style={styles.sheetClose}
                >
                  <Text style={styles.sheetCloseText}>
                    {sheet === "menu" ? "Close" : "Back"}
                  </Text>
                </Pressable>
              </SafeAreaView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerBack: {
    marginLeft: -12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },
  headerName: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  headerMeta: {
    marginTop: 1,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkSoft,
  },
  headerMore: {
    marginRight: -12,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingBottom: 8,
  },
  day: {
    gap: 12,
    marginBottom: 12,
  },
  dayLabel: {
    alignSelf: "center",
    ...typography.micro,
    color: colors.inkMuted,
  },
  safety: {
    alignSelf: "flex-end",
    maxWidth: 282,
  },
  notice: {
    ...typography.body,
    color: colors.inkSoft,
  },
  error: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  composerInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    marginRight: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.paper,
    borderRadius: radius.control,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.ink,
  },
  send: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
  },
  sendOff: {
    backgroundColor: colors.hairline,
  },
  closedNote: {
    paddingVertical: 8,
    ...typography.body,
    color: colors.inkSoft,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12,12,10,0.28)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    padding: 20,
  },
  sheetTitle: {
    ...typography.title,
    color: colors.ink,
  },
  sheetBody: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: tapTarget + 6,
  },
  sheetRowText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  reasonInput: {
    marginTop: 12,
    minHeight: 96,
    padding: 16,
    backgroundColor: colors.paper,
    borderRadius: radius.control,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: "top",
  },
  sheetClose: {
    minHeight: tapTarget,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    ...typography.body,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
