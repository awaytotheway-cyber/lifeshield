import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { Surface } from "@/components/ui/Surface";
import { COPY } from "@/lib/copy";
import { colors, spacing, status } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure and warning text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

type ConsentRow = {
  consent_type: string;
  consented: boolean;
  consented_at: string | null;
};

export default function ConsentsSettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setMessage(COPY.missingKeys);
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("consent_records")
        .select("consent_type, consented, consented_at")
        .eq("user_id", session.user.id)
        .order("consented_at", { ascending: false });
      if (error) {
        throw error;
      }
      setRows((data as ConsentRow[]) ?? []);
      setMessage(null);
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.consentsSettingsLoadFailed));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <ScreenHeader
        title={COPY.consentsSettingsTitle}
        onBack={() => router.replace(routes.settingsPrivacy)}
      />
      <Text style={styles.body}>{COPY.consentsSettingsBody}</Text>
      {loading ? <StaticSkeleton rows={2} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
      {!loading && !message && rows.length === 0 ? (
        <EmptyState
          heading={COPY.consentsSettingsEmpty}
          explanation={COPY.consentsSettingsEmptyBody}
        />
      ) : null}
      {rows.map((row, index) => (
        <Surface key={`${row.consent_type}-${index}`} style={styles.card}>
          <View style={styles.rowTextCol}>
            <Text style={styles.type}>{row.consent_type}</Text>
            {row.consented_at ? (
              <Text style={styles.given}>
                {`Given ${row.consented_at.slice(0, 10)}`}
              </Text>
            ) : null}
          </View>
          <StatusChip
            kind={row.consented ? "withinRange" : "worthWatching"}
            label={row.consented ? "Agreed" : "Not agreed"}
          />
        </Surface>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.inkSoft,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
  // A row, not a stack: the name reads left, the status reads right.
  card: {
    marginTop: spacing.mdSm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.mdSm,
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  type: {
    ...typography.body,
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
  given: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkMuted,
  },
});
