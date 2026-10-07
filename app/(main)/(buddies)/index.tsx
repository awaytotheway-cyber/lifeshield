import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import {
  acceptConnection,
  archiveConnection,
  declineConnection,
  loadBuddyProfile,
  loadOwnConnections,
  otherPartyId,
  reactivateConnection,
  type BuddyProfile,
  type ConnectionRow,
} from "@/lib/buddies";
import { buddyChatHref, routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function BuddiesListScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, BuddyProfile | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return;
    setState("loading");
    setMessage(null);
    const result = await loadOwnConnections(uid);
    if (!result.ok) {
      setState("error");
      setMessage(result.message);
      setRows([]);
      return;
    }
    setState("ready");
    setRows(result.rows);
    const map: Record<string, BuddyProfile | null> = {};
    await Promise.all(
      result.rows.map(async (row) => {
        const other = otherPartyId(row, uid);
        if (profiles[other] !== undefined) {
          map[other] = profiles[other];
          return;
        }
        const p = await loadBuddyProfile(other);
        map[other] = p.ok ? p.row : null;
      }),
    );
    setProfiles((prev) => ({ ...prev, ...map }));
  }, [session?.user.id, profiles]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  if (!session) return <Redirect href={routes.login} />;

  const uid = session.user.id;
  const active = rows.filter((r) => r.status === "active");
  const incoming = rows.filter(
    (r) => r.status === "requested" && r.addressee_id === uid,
  );
  const outgoing = rows.filter(
    (r) => r.status === "requested" && r.requester_id === uid,
  );

  const runAction = async (
    fn: () => Promise<{ ok: true } | { ok: false; message: string }>,
    id: string,
  ) => {
    setBusyId(id);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) setMessage(res.message);
    await load();
  };

  return (
    <Screen scroll contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={COPY.buddiesTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />
      <Text style={styles.body}>{COPY.buddiesSubtitle}</Text>

      <View style={styles.cta}>
        <PrimaryButton
          title={COPY.buddiesFindCta}
          onPress={() => router.push(routes.buddiesFind)}
        />
        <TextButton
          title="Buddy settings"
          onPress={() => router.push(routes.settingsBuddies)}
        />
      </View>

      {state === "loading" ? <StaticSkeleton rows={3} /> : null}

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {incoming.length > 0 ? (
        <>
          <Text style={styles.section}>{COPY.buddiesRequestsHeader}</Text>
          {incoming.map((row) => {
            const p = profiles[otherPartyId(row, uid)];
            return (
              <View key={row.id} style={styles.card}>
                <Text style={styles.name}>{p?.display_name ?? "Buddy"}</Text>
                {p?.city ? <Text style={styles.meta}>{p.city}</Text> : null}
                {row.request_note ? (
                  <Text style={styles.note}>&ldquo;{row.request_note}&rdquo;</Text>
                ) : null}
                <View style={styles.rowActions}>
                  <PrimaryButton
                    title={COPY.buddiesAccept}
                    loading={busyId === row.id}
                    onPress={() => runAction(() => acceptConnection(row.id), row.id)}
                  />
                  <TextButton
                    title={COPY.buddiesDecline}
                    onPress={() =>
                      runAction(() => declineConnection(row.id), row.id)
                    }
                  />
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {outgoing.length > 0 ? (
        <>
          <Text style={styles.section}>Sent</Text>
          {outgoing.map((row) => {
            const p = profiles[otherPartyId(row, uid)];
            return (
              <View key={row.id} style={styles.card}>
                <Text style={styles.name}>{p?.display_name ?? "Buddy"}</Text>
                <Text style={styles.metaLight}>{COPY.buddiesRequestSent}</Text>
                <TextButton
                  title={COPY.buddiesArchive}
                  onPress={() =>
                    runAction(() => archiveConnection(row.id), row.id)
                  }
                />
              </View>
            );
          })}
        </>
      ) : null}

      <Text style={styles.section}>{COPY.buddiesActiveHeader}</Text>
      {active.length === 0 && state === "ready" ? (
        <EmptyState
          icon="users"
          heading={COPY.buddiesEmptyTitle}
          explanation={COPY.buddiesEmptyBody}
        />
      ) : null}
      {active.map((row) => {
        const p = profiles[otherPartyId(row, uid)];
        return (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            onPress={() => router.push(buddyChatHref(row.id))}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.name}>{p?.display_name ?? "Buddy"}</Text>
            {p?.city ? <Text style={styles.meta}>{p.city}</Text> : null}
            {p?.interests?.length ? (
              <Text style={styles.metaLight}>{p.interests.join(" · ")}</Text>
            ) : null}
            <View style={styles.rowActions}>
              <TextButton title={COPY.buddiesOpenChat} onPress={() => router.push(buddyChatHref(row.id))} />
              <TextButton
                title={COPY.buddiesArchive}
                onPress={() => runAction(() => archiveConnection(row.id), row.id)}
              />
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 22,
    color: Ink.soft,
  },
  cta: { marginTop: Measure.base },
  section: {
    marginTop: Measure.section,
    marginBottom: Measure.tight,
    fontFamily: SpecimenType.serif,
    fontSize: 18,
    color: Ink.full,
  },
  card: {
    marginBottom: Measure.tight,
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
    padding: Measure.base,
  },
  cardPressed: { opacity: 0.85 },
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
    marginTop: 2,
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Ink.faint,
  },
  note: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    color: Ink.soft,
    fontStyle: "italic",
  },
  rowActions: {
    marginTop: Measure.tight,
    flexDirection: "row",
    gap: Measure.snug,
    flexWrap: "wrap",
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
