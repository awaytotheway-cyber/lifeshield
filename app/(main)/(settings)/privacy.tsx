import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Toast } from "@/components/ui/Toast";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { exportOwnData } from "@/lib/data-export";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { Colors, Space, typeStyle } from "@/lib/theme";
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
    <Screen scroll>
      <ScreenHeader
        title={COPY.privacyTitle}
        subtitle={COPY.privacyBody}
        onBack={() => router.replace(routes.settings)}
        backLabel={COPY.settingsTitle}
      />

      <TrustBanner title={COPY.privacyTitle} body={COPY.privacyBody} />

      <SectionTitle title="Your copy of the data" />
      <Card>
        <Text style={styles.retention}>{COPY.privacyRetention}</Text>
        <PrimaryButton
          title={COPY.privacyExport}
          loading={exporting}
          disabled={exporting}
          onPress={() => void onExport()}
        />
      </Card>

      <SectionTitle title="Documents and consents" />
      <Card padded={false} style={styles.rowsCard}>
        <ListRow
          label={COPY.privacyConsents}
          icon="check-circle"
          onPress={() => router.push(routes.settingsConsents)}
        />
        <ListRow
          label={COPY.privacyPolicyLink}
          icon="file-text"
          onPress={() => void openLegal("privacy")}
        />
        <ListRow
          label={COPY.privacyTermsLink}
          icon="file"
          divider={false}
          onPress={() => void openLegal("terms")}
        />
      </Card>

      <SectionTitle title="Closing your account" />
      <Card padded={false} style={styles.rowsCard}>
        <ListRow
          label={COPY.privacyDelete}
          icon="trash-2"
          destructive
          divider={false}
          onPress={() => router.push(routes.settingsDeleteAccount)}
        />
      </Card>

      {message ? (
        <View>
          <Text style={styles.error}>{message}</Text>
        </View>
      ) : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  retention: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  rowsCard: {
    paddingHorizontal: Space.cardPad,
    paddingVertical: Space.xs,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
});
