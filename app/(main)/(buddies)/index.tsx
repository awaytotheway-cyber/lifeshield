import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { COPY } from "@/lib/copy";
import {
  acceptConnection,
  archiveConnection,
  declineConnection,
  loadBuddyProfile,
  loadOwnConnections,
  otherPartyId,
  type BuddyProfile,
  type ConnectionRow,
} from "@/lib/buddies";
import { buddyChatHref, routes } from "@/lib/routes";
import { Colors, Font, Gap, Radius, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Avatar circle plus name and city — the top of every buddy card. */
function BuddyIdentity({
  name,
  city,
  right,
}: {
  name: string;
  city?: string | null;
  right?: ReactNode;
}) {
  return (
    <View style={styles.identity}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialOf(name)}</Text>
      </View>
      <View style={styles.identityText}>
        <Text style={styles.name}>{name}</Text>
        {city ? <Text style={styles.meta}>{city}</Text> : null}
      </View>
      {right}
    </View>
  );
}

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
    <Screen scroll>
      <ScreenHeader
        title={COPY.buddiesTitle}
        subtitle={COPY.buddiesSubtitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      <PrimaryButton
        title={COPY.buddiesFindCta}
        icon="user-plus"
        style={styles.cta}
        onPress={() => router.push(routes.buddiesFind)}
      />
      <TextButton
        title="Buddy settings"
        onPress={() => router.push(routes.settingsBuddies)}
      />

      {state === "loading" ? (
        <View style={styles.loading}>
          <StaticSkeleton rows={3} />
        </View>
      ) : null}

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {incoming.length > 0 ? (
        <>
          <SectionTitle title={COPY.buddiesRequestsHeader} />
          <View style={styles.list}>
            {incoming.map((row) => {
              const p = profiles[otherPartyId(row, uid)];
              return (
                <Card key={row.id}>
                  <BuddyIdentity
                    name={p?.display_name ?? "Buddy"}
                    city={p?.city}
                  />
                  {row.request_note ? (
                    <Text style={styles.note}>
                      &ldquo;{row.request_note}&rdquo;
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <SecondaryButton
                      title={COPY.buddiesAccept}
                      loading={busyId === row.id}
                      onPress={() =>
                        runAction(() => acceptConnection(row.id), row.id)
                      }
                    />
                    <TextButton
                      title={COPY.buddiesDecline}
                      onPress={() =>
                        runAction(() => declineConnection(row.id), row.id)
                      }
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      {outgoing.length > 0 ? (
        <>
          <SectionTitle title="Sent" />
          <View style={styles.list}>
            {outgoing.map((row) => {
              const p = profiles[otherPartyId(row, uid)];
              return (
                <Card key={row.id}>
                  <BuddyIdentity
                    name={p?.display_name ?? "Buddy"}
                    city={p?.city}
                    right={<Chip label={COPY.buddiesRequestSent} />}
                  />
                  <View style={styles.actions}>
                    <TextButton
                      title={COPY.buddiesArchive}
                      onPress={() =>
                        runAction(() => archiveConnection(row.id), row.id)
                      }
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      <SectionTitle title={COPY.buddiesActiveHeader} />

      {active.length === 0 && state === "ready" ? (
        <EmptyState
          icon="users"
          heading={COPY.buddiesEmptyTitle}
          explanation={COPY.buddiesEmptyBody}
        />
      ) : null}

      <View style={styles.list}>
        {active.map((row) => {
          const p = profiles[otherPartyId(row, uid)];
          return (
            <Card key={row.id}>
              <BuddyIdentity
                name={p?.display_name ?? "Buddy"}
                city={p?.city}
              />
              {p?.interests?.length ? (
                <View style={styles.interests}>
                  {p.interests.slice(0, 4).map((interest) => (
                    <Chip key={interest} label={interest} />
                  ))}
                </View>
              ) : null}
              <View style={styles.actions}>
                <SecondaryButton
                  title={COPY.buddiesOpenChat}
                  icon="message-circle"
                  onPress={() => router.push(buddyChatHref(row.id))}
                />
                <TextButton
                  title={COPY.buddiesArchive}
                  onPress={() =>
                    runAction(() => archiveConnection(row.id), row.id)
                  }
                />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: 0,
  },
  loading: {
    marginTop: Gap.sections,
  },
  list: {
    gap: Gap.cards,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.chip,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: Font.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.orangeDeep,
  },
  identityText: {
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
  interests: {
    marginTop: Space.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  note: {
    ...typeStyle("body"),
    marginTop: Space.md,
    color: Colors.body,
    fontStyle: "italic",
  },
  actions: {
    marginTop: Space.sm,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
});
