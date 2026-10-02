import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import {
  findPotentialBuddies,
  sendBuddyRequest,
  type PotentialBuddyRow,
} from "@/lib/buddies";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

export default function FindBuddiesScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PotentialBuddyRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const search = useCallback(async (query: string) => {
    setBusy(true);
    setMessage(null);
    const res = await findPotentialBuddies(query || null, 25);
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      setRows([]);
      return;
    }
    setRows(res.rows);
  }, []);

  useEffect(() => {
    void search("");
  }, [search]);

  if (!session) return <Redirect href={routes.login} />;

  const uid = session.user.id;

  const submit = async (buddy: PotentialBuddyRow) => {
    setSending(buddy.user_id);
    const res = await sendBuddyRequest({
      requesterId: uid,
      addresseeId: buddy.user_id,
      note: notes[buddy.user_id],
    });
    setSending(null);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setSentIds((prev) => new Set(prev).add(buddy.user_id));
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.buddiesFindTitle}
        onBack={() => router.back()}
        backLabel={COPY.buddiesTitle}
      />

      <TextInput
        label="Search"
        placeholder={COPY.buddiesSearchPlaceholder}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => void search(q)}
        returnKeyType="search"
      />
      <PrimaryButton
        title="Search"
        icon="search"
        loading={busy}
        onPress={() => void search(q)}
      />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {busy && rows === null ? (
        <View style={styles.loading}>
          <StaticSkeleton rows={3} />
        </View>
      ) : null}

      {rows !== null && rows.length === 0 && !busy ? (
        <View style={styles.loading}>
          <EmptyState
            icon="search"
            heading={COPY.buddiesFindTitle}
            explanation={COPY.buddiesFindEmpty}
          />
        </View>
      ) : null}

      {rows !== null && rows.length > 0 ? (
        <>
          <SectionTitle title="People with similar goals" />
          <View style={styles.list}>
            {rows.map((row) => {
              const sent = sentIds.has(row.user_id);
              return (
                <Card key={row.user_id}>
                  <View style={styles.headRow}>
                    <View style={styles.headText}>
                      <Text style={styles.name}>{row.display_name}</Text>
                      {row.city ? (
                        <Text style={styles.meta}>{row.city}</Text>
                      ) : null}
                    </View>
                    {row.match_score > 0 ? (
                      <Chip
                        label={`${row.match_score}% ${COPY.buddiesMatchLabel}`}
                        tone="orange"
                      />
                    ) : null}
                  </View>

                  {row.shared_interests.length > 0 ? (
                    <>
                      <Text style={styles.subLabel}>
                        {COPY.buddiesSharedInterestsLabel}
                      </Text>
                      <View style={styles.tags}>
                        {row.shared_interests.map((interest) => (
                          <Chip key={interest} label={interest} tone="orange" />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {row.interests.length > 0 ? (
                    <View style={styles.tags}>
                      {row.interests.slice(0, 5).map((interest) => (
                        <Chip key={interest} label={interest} />
                      ))}
                    </View>
                  ) : null}

                  {sent ? (
                    <View style={styles.sent}>
                      <Chip label={COPY.buddiesRequestSent} tone="green" />
                    </View>
                  ) : (
                    <>
                      <TextInput
                        label={COPY.buddiesRequestNoteLabel}
                        placeholder={COPY.buddiesRequestNotePlaceholder}
                        value={notes[row.user_id] ?? ""}
                        onChangeText={(t) =>
                          setNotes((prev) => ({ ...prev, [row.user_id]: t }))
                        }
                        multiline
                        numberOfLines={2}
                      />
                      <SecondaryButton
                        title={COPY.buddiesSendRequest}
                        icon="send"
                        loading={sending === row.user_id}
                        onPress={() => submit(row)}
                      />
                    </>
                  )}
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      <TextButton title="Back to buddies" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Gap.sections,
  },
  list: {
    gap: Gap.cards,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  headText: {
    flex: 1,
  },
  name: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  meta: {
    ...typeStyle("secondary"),
    marginTop: 2,
    color: Colors.muted,
  },
  subLabel: {
    ...typeStyle("label"),
    marginTop: Space.md,
    color: Colors.muted,
  },
  tags: {
    marginTop: Space.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  sent: {
    marginTop: Space.md,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
});
