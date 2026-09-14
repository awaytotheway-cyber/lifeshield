import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
          icon="check-circle"
          heading={COPY.consentsSettingsEmpty}
          explanation={COPY.consentsSettingsBody}
        />
      ) : null}
      {rows.map((row, index) => (
        <GlassCard
          key={`${row.consent_type}-${index}`}
          intensity="card"
          style={styles.card}
        >
          <Text style={styles.type}>{row.consent_type}</Text>
          <Text style={styles.status}>
            {row.consented ? "Agreed" : "Not agreed"}
            {row.consented_at ? ` · ${row.consented_at.slice(0, 10)}` : ""}
          </Text>
        </GlassCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  error: {
    marginTop: 12,
    color: colors.coral,
    fontFamily: fontFamily.body,
  },
  card: {
    marginTop: spacing.mdSm,
    padding: spacing.base,
  },
  type: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  status: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
  },
});
