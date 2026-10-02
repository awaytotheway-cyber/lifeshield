import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { COPY } from "@/lib/copy";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { Colors, Font, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** One quiet label with its value underneath. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function AboutSettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "1.0.0";

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
        title={COPY.aboutTitle}
        subtitle={COPY.aboutBody}
        onBack={() => router.replace(routes.settings)}
        backLabel={COPY.settingsTitle}
      />

      <Card style={styles.brandCard}>
        <Text style={styles.brand} accessibilityRole="header">
          PRESCOPE
        </Text>
        <Text style={styles.brandVersion}>
          {COPY.aboutVersion} {version}
        </Text>
      </Card>

      <SectionTitle title="Details" />
      <Card>
        <View style={styles.facts}>
          <Fact label={COPY.aboutCompany} value={COPY.aboutCompany} />
          <Fact label={COPY.aboutWhatsNew} value={COPY.aboutWhatsNewBody} />
          <Fact label={COPY.aboutOss} value={COPY.aboutOssBody} />
        </View>
      </Card>

      <SectionTitle title="Legal" />
      <Card padded={false} style={styles.rowsCard}>
        <ListRow
          label={COPY.privacyPolicyLink}
          icon="file-text"
          onPress={() => {
            void WebBrowser.openBrowserAsync(legalPageUrl("privacy"));
          }}
        />
        <ListRow
          label={COPY.privacyTermsLink}
          icon="file"
          divider={false}
          onPress={() => {
            void WebBrowser.openBrowserAsync(legalPageUrl("terms"));
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    alignItems: "center",
    paddingVertical: Space.xl,
  },
  brand: {
    fontFamily: Font.serif,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 1.5,
    color: Colors.orange,
  },
  brandVersion: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.muted,
  },
  facts: {
    gap: Gap.rowY + 6,
  },
  label: {
    ...typeStyle("label"),
    color: Colors.muted,
  },
  value: {
    ...typeStyle("body"),
    marginTop: Space.xs,
    color: Colors.body,
  },
  rowsCard: {
    paddingHorizontal: Space.cardPad,
    paddingVertical: Space.xs,
  },
});
