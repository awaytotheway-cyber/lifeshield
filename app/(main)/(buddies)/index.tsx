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
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { buddyChatHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

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
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
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
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
  },
  cta: { marginTop: spacing.base },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  card: {
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    ...shadows.card,
  },
  cardPressed: { opacity: 0.85 },
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
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mist,
  },
  note: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
    fontStyle: "italic",
  },
  rowActions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.mdSm,
    flexWrap: "wrap",
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHighText,
  },
});
