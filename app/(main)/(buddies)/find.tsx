import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import {
  findPotentialBuddies,
  sendBuddyRequest,
  type PotentialBuddyRow,
} from "@/lib/buddies";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

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
    <Screen scroll contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={COPY.buddiesFindTitle}
        onBack={() => router.back()}
        backLabel={COPY.buddiesTitle}
      />

      <View style={styles.searchWrap}>
        <TextInput
          label="Search"
          placeholder={COPY.buddiesSearchPlaceholder}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void search(q)}
          returnKeyType="search"
        />
        <View style={{ marginTop: Measure.tight }}>
          <PrimaryButton title="Search" onPress={() => void search(q)} loading={busy} />
        </View>
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {busy && rows === null ? <StaticSkeleton rows={3} /> : null}

      {rows !== null && rows.length === 0 && !busy ? (
        <EmptyState
          icon="search"
          heading={COPY.buddiesFindTitle}
          explanation={COPY.buddiesFindEmpty}
        />
      ) : null}

      {(rows ?? []).map((row) => {
        const sent = sentIds.has(row.user_id);
        return (
          <View key={row.user_id} style={styles.card}>
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{row.display_name}</Text>
                {row.city ? <Text style={styles.meta}>{row.city}</Text> : null}
              </View>
              {row.match_score > 0 ? (
                <View style={styles.matchPill}>
                  <Text style={styles.matchText}>
                    {row.match_score}% {COPY.buddiesMatchLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {row.shared_interests.length > 0 ? (
              <>
                <Text style={styles.subLabel}>
                  {COPY.buddiesSharedInterestsLabel}
                </Text>
                <Text style={styles.subText}>
                  {row.shared_interests.join(" · ")}
                </Text>
              </>
            ) : null}
            {row.interests.length > 0 ? (
              <Text style={styles.metaLight}>{row.interests.join(" · ")}</Text>
            ) : null}

            {sent ? (
              <Text style={styles.sentBadge}>{COPY.buddiesRequestSent}</Text>
            ) : (
              <>
                <View style={{ marginTop: Measure.tight }}>
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
                </View>
                <View style={{ marginTop: Measure.tight }}>
                  <PrimaryButton
                    title={COPY.buddiesSendRequest}
                    loading={sending === row.user_id}
                    onPress={() => submit(row)}
                  />
                </View>
              </>
            )}
          </View>
        );
      })}

      <TextButton title="Back to buddies" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginTop: Measure.tight,
    marginBottom: Measure.base,
  },
  card: {
    marginBottom: Measure.tight,
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
    padding: Measure.base,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Measure.tight,
  },
  name: {
    fontFamily: SpecimenType.serif,
    fontSize: 19,
    color: Ink.full,
  },
  meta: {
    marginTop: 2,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
  },
  metaLight: {
    marginTop: Measure.hair,
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Ink.faint,
  },
  matchPill: {
    backgroundColor: Accent.sageWash,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Edge.tag,
  },
  matchText: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 14,
    color: Accent.sage,
  },
  subLabel: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 13,
    letterSpacing: 0.4,
    color: Ink.soft,
    textTransform: "uppercase",
  },
  subText: {
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.full,
  },
  sentBadge: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.monoBold,
    fontSize: 15,
    color: Accent.tag,
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
