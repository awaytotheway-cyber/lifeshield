import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { EmptyBox } from "@/components/illustrations";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Honest shell — prescriptions are not in schema; PRESCOPE does not prescribe. */
export default function PrescriptionsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);

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
        title={COPY.prescriptionsTitle}
        onBack={() => router.back()}
      />
      <Card>
        <View style={styles.wrap}>
          <EmptyBox width={160} height={160} />
          <Text style={styles.heading}>{COPY.prescriptionsEmptyHeading}</Text>
          <Text style={styles.body}>{COPY.prescriptionsEmptyBody}</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: Space.sm,
  },
  heading: {
    marginTop: Space.lg,
    ...typeStyle("section"),
    color: Colors.ink,
    textAlign: "center",
  },
  body: {
    marginTop: Space.sm,
    ...typeStyle("body"),
    color: Colors.body,
    textAlign: "center",
  },
});
