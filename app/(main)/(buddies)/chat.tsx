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
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

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
    <Screen contentPadding={Measure.gutter} centered={false}>
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
        <View style={{ marginTop: Measure.base }}>
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
  chatWrap: { flex: 1, marginTop: Measure.tight },
  list: {
    padding: Measure.tight,
    gap: Measure.tight,
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
    backgroundColor: Accent.tag,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: Paper.sheet,
  },
  bubbleText: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Ink.full,
  },
  bubbleTextMine: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Paper.mount,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Measure.tight,
    paddingTop: Measure.tight,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: Edge.none,
    backgroundColor: Accent.tag,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: {
    fontFamily: SpecimenType.monoBold,
    color: Paper.mount,
  },
  empty: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Ink.soft,
    textAlign: "center",
  },
  staleCard: {
    marginTop: Measure.base,
    padding: Measure.base,
    backgroundColor: Accent.ochreWash,
    borderRadius: Edge.mount,
  },
  staleTitle: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 17,
    color: Ink.full,
  },
  staleBody: {
    marginTop: Measure.hair,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
  },
  staleActions: {
    marginTop: Measure.tight,
    flexDirection: "row",
    gap: Measure.snug,
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
