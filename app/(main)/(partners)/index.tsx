import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import {
  activityMinutesByDay,
  loadOwnPartnerLinks,
  loadPartners,
  loadRecentActivities,
  openPartner,
  togglePartnerLink,
  type DailyActivityRow,
  type PartnerKind,
  type PartnerLinkRow,
  type PartnerRow,
} from "@/lib/partners";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

export default function PartnersScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [links, setLinks] = useState<PartnerLinkRow[]>([]);
  const [activities, setActivities] = useState<DailyActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return;
    setLoading(true);
    const [p, l, a] = await Promise.all([
      loadPartners(),
      loadOwnPartnerLinks(uid),
      loadRecentActivities(uid),
    ]);
    setLoading(false);
    if (!p.ok) {
      setMessage(p.message);
      return;
    }
    setMessage(null);
    setPartners(p.rows);
    if (l.ok) setLinks(l.rows);
    if (a.ok) setActivities(a.rows);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const grouped = useMemo(() => {
    const map = new Map<PartnerKind, PartnerRow[]>();
    for (const p of partners) {
      const arr = map.get(p.kind) ?? [];
      arr.push(p);
      map.set(p.kind, arr);
    }
    return map;
  }, [partners]);

  const linkedIds = useMemo(() => {
    return new Set(links.filter((l) => l.status === "linked").map((l) => l.partner_id));
  }, [links]);

  const weeklyMinutes = useMemo(() => {
    return activityMinutesByDay(activities, 7).reduce((s, d) => s + d.minutes, 0);
  }, [activities]);

  if (!session) return <Redirect href={routes.login} />;

  const runToggle = async (p: PartnerRow) => {
    setBusyId(p.id);
    const res = await togglePartnerLink(session.user.id, p.id, linkedIds.has(p.id));
    setBusyId(null);
    if (!res.ok) setMessage(res.message);
    await load();
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.partnersTitle}
        subtitle={COPY.partnersSubtitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      <View style={styles.statRow}>
        <StatCard
          value={String(weeklyMinutes)}
          label={COPY.activityWeeklyMinutes}
        />
      </View>

      <PrimaryButton
        title={COPY.partnersLogActivityCta}
        icon="plus"
        onPress={() => router.push(routes.partnersLog)}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}
      {message ? (
        <View style={styles.errorWrap}>
          <Card>
            <Text style={styles.error}>{message}</Text>
          </Card>
        </View>
      ) : null}

      {(
        [
          ["meditation", COPY.partnersMeditationHeader],
          ["exercise", COPY.partnersExerciseHeader],
          ["sleep", COPY.partnersOtherHeader],
          ["nutrition", COPY.partnersOtherHeader],
          ["other", COPY.partnersOtherHeader],
        ] as [PartnerKind, string][]
      ).map(([kind, header]) => {
        const items = grouped.get(kind) ?? [];
        if (items.length === 0) return null;
        return (
          <View key={kind}>
            <SectionTitle title={header} />
            <View style={styles.stack}>
              {items.map((p) => {
                const linked = linkedIds.has(p.id);
                return (
                  <Card key={p.id}>
                    <View style={styles.headRow}>
                      <Text style={styles.name}>{p.name}</Text>
                      {linked ? (
                        <Chip label={COPY.partnersLinkedBadge} tone="green" />
                      ) : null}
                    </View>
                    {p.description ? (
                      <Text style={styles.meta}>{p.description}</Text>
                    ) : null}
                    <View style={styles.actions}>
                      <View style={styles.actionCell}>
                        <SecondaryButton
                          title={linked ? COPY.partnersUnlink : COPY.partnersLink}
                          loading={busyId === p.id}
                          onPress={() => runToggle(p)}
                        />
                      </View>
                      <View style={styles.actionCell}>
                        <TextButton
                          title={COPY.partnersOpen}
                          onPress={() => void openPartner(p)}
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        );
      })}

      <SectionTitle title={COPY.partnersActivityHeader} icon="activity" />
      {activities.length === 0 ? (
        <Card>
          <Text style={styles.emptyBody}>{COPY.partnersActivityEmpty}</Text>
        </Card>
      ) : (
        <Card padded={false} style={styles.listCard}>
          {activities.slice(0, 10).map((a, index, all) => (
            <ListRow
              key={a.id}
              label={
                a.activity_type.charAt(0).toUpperCase() +
                a.activity_type.slice(1)
              }
              subtitle={`${a.duration_min ? `${a.duration_min} min · ` : ""}${
                a.intensity ?? ""
              }${a.performed_at ? ` · ${a.performed_at.slice(0, 10)}` : ""}`}
              divider={index < all.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    gap: Gap.cards,
  },
  errorWrap: {
    marginTop: Gap.cards,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  stack: {
    gap: Gap.cards,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  name: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  meta: {
    marginTop: Space.xs,
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  actionCell: {
    flex: 1,
  },
  emptyBody: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  listCard: {
    paddingHorizontal: Space.cardPad,
    paddingVertical: Space.xs,
  },
});
