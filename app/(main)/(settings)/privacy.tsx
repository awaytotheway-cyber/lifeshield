import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Surface } from "@/components/ui/Surface";
import { Toast } from "@/components/ui/Toast";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { exportOwnData } from "@/lib/data-export";
import { colors, spacing, status } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const openLegal = async (section: "privacy" | "terms") => {
    try {
      await WebBrowser.openBrowserAsync(legalPageUrl(section));
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.privacyExportFailed));
    }
  };

  const onExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const result = await exportOwnData(session.user.id);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setToast(COPY.privacyExportDone);
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.privacyExportFailed));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back to settings"
          onPress={() => router.replace(routes.settings)}
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone
          size="xl"
          parts={[{ text: COPY.privacyTitle, tone: "bold" }]}
        />
      </View>

      {/*
        Exactly what the transport and the row-level rules do, and what the
        app does not claim. Verbatim and in full — this is the screen the
        sentence exists for. It was previously rendered twice, as a lede and
        again inside this banner; one copy of it says the same thing.
      */}
      <View style={styles.banner}>
        <TrustBanner title={COPY.privacyTitle} body={COPY.privacyBody} />
      </View>

      <Text style={styles.groupLabel}>{COPY.settingsGroupYourData}</Text>
      <Surface style={styles.card}>
        {/* How long data is kept and who finishes a deletion. Never trimmed. */}
        <Text style={styles.retention}>{COPY.privacyRetention}</Text>
      </Surface>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {/* The one black button on this screen. */}
      <PrimaryButton
        title={COPY.privacyExport}
        loading={exporting}
        disabled={exporting}
        onPress={() => void onExport()}
      />
      <TextButton
        title={COPY.privacyConsents}
        onPress={() => router.push(routes.settingsConsents)}
      />
      <TextButton
        title={COPY.privacyPolicyLink}
        onPress={() => void openLegal("privacy")}
      />
      <TextButton
        title={COPY.privacyTermsLink}
        onPress={() => void openLegal("terms")}
      />
      <TextButton
        title={COPY.privacyDelete}
        onPress={() => router.push(routes.settingsDeleteAccount)}
      />

      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    // Pulled into the gutter so the glyph, not its 44pt hit area, lines up
    // with the headline under it.
    marginLeft: -12,
  },
  banner: {
    marginTop: spacing.md,
  },
  groupLabel: {
    marginTop: 22,
    marginBottom: 10,
    ...typography.micro,
    // 11px micro labels use `inkMuted`; `inkFaint` is headline-only.
    color: colors.inkMuted,
  },
  card: {
    marginBottom: spacing.sm,
  },
  retention: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
});
