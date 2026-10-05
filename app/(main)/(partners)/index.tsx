import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
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
import { fontFamily } from "@/lib/typography";
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
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.partnersTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />
      <Text style={styles.body}>{COPY.partnersSubtitle}</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{weeklyMinutes}</Text>
        <Text style={styles.summaryLabel}>{COPY.activityWeeklyMinutes}</Text>
      </View>

      <View style={{ marginTop: spacing.sm }}>
        <PrimaryButton
          title={COPY.partnersLogActivityCta}
          onPress={() => router.push(routes.partnersLog)}
        />
      </View>

      {loading ? <StaticSkeleton rows={4} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

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
          <View key={kind} style={styles.group}>
            <Text style={styles.section}>{header}</Text>
            {items.map((p) => {
              const linked = linkedIds.has(p.id);
              return (
                <View key={p.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.headRow}>
                      <Text style={styles.name}>{p.name}</Text>
                      {linked ? (
                        <Text style={styles.linked}>{COPY.partnersLinkedBadge}</Text>
                      ) : null}
                    </View>
                    {p.description ? (
                      <Text style={styles.meta}>{p.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <TextButton
                      title={linked ? COPY.partnersUnlink : COPY.partnersLink}
                      loading={busyId === p.id}
                      onPress={() => runToggle(p)}
                    />
                    <TextButton title={COPY.partnersOpen} onPress={() => void openPartner(p)} />
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      <Text style={styles.section}>{COPY.partnersActivityHeader}</Text>
      {activities.length === 0 ? (
        <Text style={styles.emptyLine}>{COPY.partnersActivityEmpty}</Text>
      ) : (
        activities.slice(0, 10).map((a) => (
          <View key={a.id} style={styles.activityRow}>
            <Text style={styles.activityType}>{a.activity_type}</Text>
            <Text style={styles.activityMeta}>
              {a.duration_min ? `${a.duration_min} min · ` : ""}
              {a.intensity ?? ""}
              {a.performed_at ? ` · ${a.performed_at.slice(0, 10)}` : ""}
            </Text>
          </View>
        ))
      )}
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
  summary: {
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.iceBlue,
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: fontFamily.heroStat,
    fontSize: 40,
    color: colors.primaryBlue,
  },
  summaryLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
    letterSpacing: 0.2,
  },
  group: { marginTop: spacing.lg },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    ...shadows.card,
    gap: spacing.sm,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontFamily: fontFamily.bodySemi, fontSize: 15, color: colors.charcoal },
  linked: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
  },
  meta: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
  },
  actions: { justifyContent: "space-between", alignItems: "flex-end" },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityType: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.charcoal,
    textTransform: "capitalize",
  },
  activityMeta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
  },
  emptyLine: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHigh,
  },
});
