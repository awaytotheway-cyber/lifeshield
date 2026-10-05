import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  disconnectPlugin,
  loadOwnEnabledPlugins,
  loadPlugins,
  togglePlugin,
  type EnabledPluginRow,
  type PluginCategory,
  type PluginRow,
} from "@/lib/plugins";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

const CATEGORY_HEADER: Record<PluginCategory, string> = {
  data_import: COPY.pluginsCategoryDataImport,
  content_recommendation: COPY.pluginsCategoryContent,
  social: COPY.pluginsCategorySocial,
  notifications: COPY.pluginsCategoryNotifications,
  integrations: COPY.pluginsCategoryIntegrations,
  other: COPY.pluginsCategoryOther,
};

const CATEGORY_ORDER: PluginCategory[] = [
  "integrations",
  "notifications",
  "content_recommendation",
  "social",
  "data_import",
  "other",
];

export default function PluginsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [plugins, setPlugins] = useState<PluginRow[]>([]);
  const [enabled, setEnabled] = useState<Record<string, EnabledPluginRow>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return;
    setLoading(true);
    const [ps, es] = await Promise.all([loadPlugins(), loadOwnEnabledPlugins(uid)]);
    setLoading(false);
    if (!ps.ok) {
      setMessage(ps.message);
      return;
    }
    setMessage(null);
    setPlugins(ps.rows);
    if (es.ok) {
      const map: Record<string, EnabledPluginRow> = {};
      for (const row of es.rows) map[row.plugin_id] = row;
      setEnabled(map);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const grouped = useMemo(() => {
    const map = new Map<PluginCategory, PluginRow[]>();
    for (const p of plugins) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return map;
  }, [plugins]);

  if (!session) return <Redirect href={routes.login} />;

  const flip = async (p: PluginRow, next: boolean) => {
    setBusyId(p.id);
    const res = await togglePlugin(session.user.id, p.id, next);
    setBusyId(null);
    if (!res.ok) setMessage(res.message);
    await load();
  };

  const disconnect = async (p: PluginRow) => {
    setBusyId(p.id);
    const res = await disconnectPlugin(session.user.id, p.id);
    setBusyId(null);
    if (!res.ok) setMessage(res.message);
    await load();
  };

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.pluginsTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />
      <Text style={styles.body}>{COPY.pluginsSubtitle}</Text>

      {loading && plugins.length === 0 ? <StaticSkeleton rows={4} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat) ?? [];
        if (items.length === 0) return null;
        return (
          <View key={cat} style={{ marginTop: spacing.lg }}>
            <Text style={styles.section}>{CATEGORY_HEADER[cat]}</Text>
            {items.map((p) => {
              const state = enabled[p.id];
              const on = state?.enabled ?? false;
              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.headRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.name}</Text>
                      {p.provider ? (
                        <Text style={styles.provider}>{p.provider}</Text>
                      ) : null}
                    </View>
                    <Switch
                      value={on}
                      onValueChange={(v) => flip(p, v)}
                      disabled={busyId === p.id}
                      trackColor={{ true: colors.primaryBlue, false: colors.border }}
                      thumbColor={colors.white}
                    />
                  </View>

                  <Text style={styles.desc}>{p.description}</Text>

                  <Text style={styles.subLabel}>{COPY.pluginsPrivacyLabel}</Text>
                  <Text style={styles.privacy}>{p.privacy_disclosure}</Text>

                  {state ? (
                    <View style={styles.usageRow}>
                      <Text style={styles.usageLabel}>{COPY.pluginsUsage}</Text>
                      <Text style={styles.usageValue}>{state.usage_count}</Text>
                    </View>
                  ) : null}

                  {state && !on ? (
                    <TextButton
                      title={COPY.pluginsDisconnect}
                      onPress={() => disconnect(p)}
                    />
                  ) : null}

                  {on ? (
                    <Text style={styles.enabledBadge}>
                      ● {COPY.pluginsEnabledBadge}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
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
  section: {
    marginBottom: spacing.sm,
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  provider: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mist,
  },
  desc: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
  },
  subLabel: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.slate,
  },
  privacy: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  usageRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  usageLabel: { fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.slate },
  usageValue: { fontFamily: fontFamily.bodySemi, fontSize: 13, color: colors.charcoal },
  enabledBadge: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHigh,
  },
});
