import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import {
  loadOwnMedications,
  type MedicationRow,
} from "@/lib/supplements-io";
import { fontFamily } from "@/lib/typography";
import { medicationHref, routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function MedicationsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<MedicationRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setState("loading");
      setErrorMessage(null);

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

      void loadOwnMedications(userId).then((outcome) => {
        if (cancelled) return;
        if (outcome.ok) {
          setRows(outcome.rows);
          setState("ready");
        } else {
          setErrorMessage(outcome.message);
          setState("error");
        }
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  const enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.supplements_v2
      : isFeatureEnabled(profile, "supplements_v2");

  const active = useMemo(
    () => rows.filter((row) => row.active),
    [rows],
  );
  const inactive = useMemo(
    () => rows.filter((row) => !row.active),
    [rows],
  );

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Medications" onBack={() => router.back()} />
        <EmptyState
          icon="thermometer"
          heading="Medications are coming soon"
          explanation="This feature is behind a flag while we test it. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Medications" onBack={() => router.back()} />

      <PrimaryButton
        title="New medication"
        onPress={() => router.push(routes.medicationsNew)}
      />

      <Text style={styles.helper}>
        Kept private. Used to flag contraindications on supplements you
        might be shown.
      </Text>

      {state === "loading" ? (
        <View style={styles.skeletons}>
          <StaticSkeleton rows={2} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load medications</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && rows.length === 0 ? (
        <EmptyState
          icon="thermometer"
          heading="No medications on file"
          explanation="Add anything you're taking (prescription or supplement) so we can flag interactions."
        />
      ) : null}

      {active.length > 0 ? (
        <View>
          <Text style={styles.sectionHeading}>Active</Text>
          <FlatList
            data={active}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MedicationCard
                row={item}
                onOpen={() => router.push(medicationHref(item.id))}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}

      {inactive.length > 0 ? (
        <View style={styles.other}>
          <Text style={styles.sectionHeading}>Stopped</Text>
          <FlatList
            data={inactive}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MedicationCard
                row={item}
                muted
                onOpen={() => router.push(medicationHref(item.id))}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function MedicationCard({
  row,
  muted,
  onOpen,
}: {
  row: MedicationRow;
  muted?: boolean;
  onOpen: () => void;
}) {
  const meta = [row.dosage, row.frequency].filter(Boolean).join(" · ");
  const dateRange = row.start_date
    ? row.end_date
      ? `${row.start_date} → ${row.end_date}`
      : `since ${row.start_date}`
    : null;
  return (
    <GlassCard intensity="card" style={[styles.card, muted ? styles.cardMuted : null]}>
      <Text style={styles.cardTitle}>{row.name}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {dateRange ? <Text style={styles.meta}>{dateRange}</Text> : null}
      {row.contraindication_codes.length > 0 ? (
        <View style={styles.tagRow}>
          {row.contraindication_codes.map((code) => (
            <Text key={code} style={styles.tag}>
              {code}
            </Text>
          ))}
        </View>
      ) : null}
      <TextButton title="Open" onPress={onOpen} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.sm,
  },
  skeletons: { gap: spacing.sm, marginTop: spacing.md },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.riskHigh,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
  },
  sectionHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  cardMuted: { opacity: 0.75 },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: spacing.micro,
  },
  meta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
    marginTop: spacing.sm,
  },
  tag: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: colors.primaryBlue,
    backgroundColor: colors.glassChrome,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    overflow: "hidden",
  },
  other: { marginTop: spacing.md },
});
