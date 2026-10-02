import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
    <Screen scroll>
      <ScreenHeader
        title={COPY.consentsSettingsTitle}
        subtitle={COPY.consentsSettingsBody}
        onBack={() => router.replace(routes.settingsPrivacy)}
        backLabel={COPY.privacyTitle}
      />

      {loading ? <StaticSkeleton rows={2} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {!loading && !message && rows.length === 0 ? (
        <EmptyState
          icon="check-circle"
          heading={COPY.consentsSettingsEmpty}
          explanation={COPY.consentsSettingsBody}
        />
      ) : null}

      {rows.length > 0 ? (
        <View style={styles.list}>
          {rows.map((row, index) => (
            <Card key={`${row.consent_type}-${index}`}>
              <View style={styles.row}>
                <Text style={styles.type}>{row.consent_type}</Text>
                <Chip
                  label={row.consented ? "Agreed" : "Not agreed"}
                  tone={row.consented ? "green" : "neutral"}
                />
              </View>
              {row.consented_at ? (
                <Text style={styles.when}>
                  Recorded {row.consented_at.slice(0, 10)}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Gap.cards,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  type: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  when: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.muted,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.red,
  },
});
