import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/specimen/Icon";

import { MenuButton } from "@/components/navigation/MenuButton";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Accent, Ink, Measure, SpecimenType, tapTarget } from "@/lib/specimen-tokens";

type LinkRow = {
  title: string;
  subtitle?: string;
  icon: IconName;
  href: typeof routes.settingsNotifications | typeof routes.profile | typeof routes.settingsPrivacy | typeof routes.settingsHelp | typeof routes.settingsAbout | typeof routes.appointments | typeof routes.prescriptions | typeof routes.notificationsInbox | typeof routes.plan | typeof routes.labResults | typeof routes.store;
};

const LINKS: LinkRow[] = [
  {
    title: COPY.settingsOpenProfile,
    icon: "user",
    href: routes.profile,
  },
  {
    title: COPY.settingsOpenNotifications,
    icon: "bell",
    href: routes.settingsNotifications,
  },
  {
    title: COPY.settingsOpenPrivacy,
    icon: "shield",
    href: routes.settingsPrivacy,
  },
  {
    title: COPY.settingsOpenHelp,
    icon: "help-circle",
    href: routes.settingsHelp,
  },
  {
    title: COPY.settingsOpenAbout,
    icon: "info",
    href: routes.settingsAbout,
  },
];

/** Settings hub — replaces the old instant redirect to profile. */
export default function SettingsIndex() {
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
    <Screen scroll contentPadding={Measure.gutter}>
      <View style={styles.top}>
        <MenuButton accessibilityLabel={COPY.settingsOpenMenu} />
        <Text style={styles.title} accessibilityRole="header">
          {COPY.settingsTitle}
        </Text>
      </View>
      <Text style={styles.body}>{COPY.settingsBody}</Text>
      <View style={styles.banner}>
        <TrustBanner />
      </View>

      <Sheet style={styles.card}>
        {LINKS.map((link) => (
          <Pressable
            key={link.title}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            onPress={() => router.push(link.href)}
            style={styles.row}
          >
            <Icon name={link.icon} size={20} color={Accent.tag} />
            <Text style={styles.rowLabel}>{link.title}</Text>
            <Icon name="chevron-right" size={20} color={Ink.faint} />
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: SpecimenType.serif,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: Accent.tag,
  },
  body: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
  },
  banner: {
    marginTop: Measure.loose,
  },
  card: {
    marginTop: Measure.loose,
    paddingVertical: Measure.tight,
    paddingHorizontal: Measure.tight,
  },
  row: {
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Measure.tight,
    paddingVertical: 10,
  },
  rowLabel: {
    flex: 1,
    fontFamily: SpecimenType.mono,
    fontSize: 18,
    color: Ink.full,
  },
});
