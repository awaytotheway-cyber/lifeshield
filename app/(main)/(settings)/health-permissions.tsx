import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Surface } from "@/components/ui/Surface";
import {
  listActivitySources,
  syncFromNativeSources,
  type SyncOutcome,
} from "@/lib/activity-source";
import { colors, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Health sources connect / disconnect screen.
 *
 * Today the only registered adapter is Manual (always available). When a
 * native module lands, its bridge calls `registerActivitySource` at
 * import time and this screen picks it up without changes here.
 */
export default function HealthPermissionsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);
  const [availability, setAvailability] = useState<
    Record<string, { available: boolean; label: string }>
  >({});
  const [syncing, setSyncing] = useState(false);
  const [outcomes, setOutcomes] = useState<SyncOutcome[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    if (isSupabaseConfigured) {
      void supabase
        .from("profiles")
        .select("feature_flags")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
        });
    } else {
      setProfile({ feature_flags: {} });
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      const next: Record<string, { available: boolean; label: string }> = {};
      for (const adapter of listActivitySources()) {
        let available = false;
        try {
          available = await adapter.isAvailable();
        } catch {
          available = false;
        }
        next[adapter.source] = { available, label: adapter.label };
      }
      if (!cancelled) setAvailability(next);
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.activity_v1
      : isFeatureEnabled(profile, "activity_v1");

  if (!session) return <Redirect href={routes.login} />;

  async function onSync() {
    if (!userId) return;
    setSyncing(true);
    setOutcomes(null);
    try {
      const results = await syncFromNativeSources(userId);
      setOutcomes(results);
    } catch (error) {
      Alert.alert(
        "Sync failed",
        error instanceof Error ? error.message : "Unknown error.",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Health sources"
        onBack={() => router.back()}
      />

      {!enabled ? (
        <Surface style={styles.card}>
          <Text style={styles.heading}>Activity tracking is off</Text>
          <Text style={styles.body}>
            Ask us to switch on the "activity" feature for your account, or come
            back here after the beta flag lands.
          </Text>
        </Surface>
      ) : null}

      <Text style={styles.sectionHeading}>Available sources</Text>
      {Object.entries(availability).map(([source, info]) => (
        <Surface key={source} style={styles.card}>
          <Text style={styles.heading}>{info.label}</Text>
          <Text style={styles.body}>
            {source === "manual"
              ? "Type readings by hand on the activity screen."
              : info.available
                ? "Connected. Tap sync below to pull the last 7 days."
                : "Not connected on this device. When the native bridge lands, you'll be prompted to grant permission."}
          </Text>
        </Surface>
      ))}

      <PrimaryButton
        title={syncing ? "Syncing…" : "Sync connected sources"}
        loading={syncing}
        onPress={onSync}
      />

      {outcomes ? (
        <View style={styles.lastSync}>
          <Text style={styles.sectionHeading}>Last sync</Text>
          {outcomes.length === 0 ? (
            <Text style={styles.body}>
              No native sources are registered yet — nothing to pull.
            </Text>
          ) : (
            outcomes.map((outcome) => (
              <Surface
                key={outcome.source}
                style={styles.card}
              >
                <Text style={styles.heading}>{outcome.source}</Text>
                <Text style={styles.body}>
                  {outcome.ok
                    ? `Synced ${outcome.inserted} reading${outcome.inserted === 1 ? "" : "s"}.`
                    : (outcome.message ?? "Not connected.")}
                </Text>
              </Surface>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
  },
  lastSync: {
    marginTop: spacing.md,
  },
  // A section header is an 11px micro-caps label, not an 18px boxed title.
  sectionHeading: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    ...typography.micro,
    color: colors.inkMuted,
  },
  heading: {
    marginBottom: spacing.micro,
    ...typography.body,
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
  body: {
    ...typography.body,
    color: colors.inkSoft,
  },
});
