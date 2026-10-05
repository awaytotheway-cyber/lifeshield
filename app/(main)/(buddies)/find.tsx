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
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
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
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
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
        <View style={{ marginTop: spacing.sm }}>
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
                <View style={{ marginTop: spacing.sm }}>
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
                <View style={{ marginTop: spacing.sm }}>
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
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  card: {
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    ...shadows.card,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  meta: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  metaLight: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mist,
  },
  matchPill: {
    backgroundColor: colors.riskLowLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  matchText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.riskLowText,
  },
  subLabel: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.slate,
  },
  subText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.charcoal,
  },
  sentBadge: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.primaryBlue,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHighText,
  },
});
