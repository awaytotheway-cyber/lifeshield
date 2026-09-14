import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Toast } from "@/components/ui/Toast";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { exportOwnData } from "@/lib/data-export";
import { colors, spacing } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
    <Screen scroll contentPadding={spacing.screenX}>
      <ScreenHeader
        title={COPY.privacyTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.body}>{COPY.privacyBody}</Text>
      <TrustBanner title={COPY.privacyTitle} body={COPY.privacyBody} />

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.retention}>{COPY.privacyRetention}</Text>
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
      </GlassCard>

      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: spacing.md,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.base,
    gap: 4,
  },
  retention: {
    marginBottom: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.charcoal,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
});
