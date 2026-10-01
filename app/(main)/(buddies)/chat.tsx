import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import {
  archiveConnection,
  isStaleConnection,
  loadBuddyProfile,
  loadMessages,
  loadOwnConnections,
  otherPartyId,
  reactivateConnection,
  sendMessage,
  type BuddyProfile,
  type ChatMessageRow,
  type ConnectionRow,
} from "@/lib/buddies";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

const POLL_MS = 10_000;

export default function BuddyChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const connectionId = typeof params.id === "string" ? params.id : null;
  const session = useAuthStore((state) => state.session);
  const [connection, setConnection] = useState<ConnectionRow | null>(null);
  const [buddy, setBuddy] = useState<BuddyProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<ChatMessageRow>>(null);

  const load = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid || !connectionId) return;
    setLoading(true);
    const conns = await loadOwnConnections(uid);
    if (!conns.ok) {
      setMessage(conns.message);
      setLoading(false);
      return;
    }
    const row = conns.rows.find((r) => r.id === connectionId) ?? null;
    setConnection(row);
    if (row) {
      const other = otherPartyId(row, uid);
      const [p, msgs] = await Promise.all([
        loadBuddyProfile(other),
        loadMessages(row.id),
      ]);
      if (p.ok) setBuddy(p.row);
      if (msgs.ok) setMessages(msgs.rows);
      else setMessage(msgs.message);
    }
    setLoading(false);
  }, [session?.user.id, connectionId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (connectionId) void refreshMessages();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, session?.user.id]);

  const refreshMessages = useCallback(async () => {
    if (!connectionId) return;
    const msgs = await loadMessages(connectionId);
    if (msgs.ok) setMessages(msgs.rows);
  }, [connectionId]);

  if (!session) return <Redirect href={routes.login} />;
  const uid = session.user.id;

  const send = async () => {
    if (!connectionId) return;
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setMessage(null);
    const res = await sendMessage({ connectionId, senderId: uid, body });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setDraft("");
    setMessages((prev) => [...prev, res.row]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const isStale = connection
    ? isStaleConnection(connection, messages.at(-1)?.created_at ?? null)
    : false;

  return (
    <Screen contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={buddy?.display_name ?? COPY.buddiesChatTitle}
        onBack={() => router.replace(routes.buddies)}
        backLabel={COPY.buddiesTitle}
      />

      {loading ? <StaticSkeleton rows={4} /> : null}

      {isStale ? (
        <View style={styles.staleCard}>
          <Text style={styles.staleTitle}>{COPY.buddiesStaleTitle}</Text>
          <Text style={styles.staleBody}>{COPY.buddiesStaleBody}</Text>
          <View style={styles.staleActions}>
            <TextButton
              title={COPY.buddiesReactivate}
              onPress={() => {
                if (connection) void reactivateConnection(connection.id).then(load);
              }}
            />
            <TextButton
              title={COPY.buddiesArchive}
              onPress={() => {
                if (connection)
                  void archiveConnection(connection.id).then(() =>
                    router.replace(routes.buddies),
                  );
              }}
            />
          </View>
        </View>
      ) : null}

      {!loading && connection?.status === "active" ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.chatWrap}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>{COPY.buddiesChatEmpty}</Text>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === uid;
              return (
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                  ]}
                >
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>
                    {item.body}
                  </Text>
                </View>
              );
            }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                label=""
                value={draft}
                onChangeText={setDraft}
                placeholder={COPY.buddiesChatPlaceholder}
                multiline
                numberOfLines={2}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={COPY.buddiesChatSend}
              onPress={send}
              disabled={busy || draft.trim().length === 0}
              style={({ pressed }) => [
                styles.sendBtn,
                (busy || draft.trim().length === 0) && styles.sendBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.sendText}>{COPY.buddiesChatSend}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {!loading && connection && connection.status !== "active" ? (
        <View style={{ marginTop: spacing.base }}>
          <Text style={styles.empty}>
            This connection is {connection.status}. Reactivate it to chat.
          </Text>
          {connection.status === "inactive" ? (
            <PrimaryButton
              title={COPY.buddiesReactivate}
              onPress={() => void reactivateConnection(connection.id).then(load)}
            />
          ) : null}
        </View>
      ) : null}

      {message ? <Text style={styles.error}>{message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chatWrap: { flex: 1, marginTop: spacing.sm },
  list: {
    padding: spacing.sm,
    gap: spacing.sm,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primaryBlue,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.iceBlue,
  },
  bubbleText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.charcoal,
  },
  bubbleTextMine: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.button,
    backgroundColor: colors.primaryBlue,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: {
    fontFamily: fontFamily.bodySemi,
    color: colors.white,
  },
  empty: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.slate,
    textAlign: "center",
  },
  staleCard: {
    marginTop: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.amberLight,
    borderRadius: radius.card,
  },
  staleTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  staleBody: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  staleActions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.mdSm,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHigh,
  },
});
