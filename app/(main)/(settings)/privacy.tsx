import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Toast } from "@/components/ui/Toast";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { exportOwnData } from "@/lib/data-export";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

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
    <Screen scroll contentPadding={Measure.gutter}>
      <ScreenHeader
        title={COPY.privacyTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.body}>{COPY.privacyBody}</Text>
      <TrustBanner title={COPY.privacyTitle} body={COPY.privacyBody} />

      <Sheet style={styles.card}>
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
      </Sheet>

      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: Measure.loose,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
  },
  card: {
    marginTop: Measure.loose,
    padding: Measure.base,
    gap: 4,
  },
  retention: {
    marginBottom: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.full,
  },
  error: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
  },
});
