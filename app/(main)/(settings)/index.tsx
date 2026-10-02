import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

type SettingsLink = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  href:
    | typeof routes.profile
    | typeof routes.settingsNotifications
    | typeof routes.settingsPrivacy
    | typeof routes.settingsHelp
    | typeof routes.settingsAbout;
};

type SettingsGroup = {
  /** Settings is the one screen where the brief allows small ALL-CAPS labels. */
  label: string;
  links: SettingsLink[];
};

const GROUPS: SettingsGroup[] = [
  {
    label: "ACCOUNT",
    links: [
      { title: COPY.settingsOpenProfile, icon: "user", href: routes.profile },
      {
        title: COPY.settingsOpenNotifications,
        icon: "bell",
        href: routes.settingsNotifications,
      },
    ],
  },
  {
    label: "DATA & PRIVACY",
    links: [
      {
        title: COPY.settingsOpenPrivacy,
        icon: "shield",
        href: routes.settingsPrivacy,
      },
    ],
  },
  {
    label: "SUPPORT",
    links: [
      {
        title: COPY.settingsOpenHelp,
        icon: "help-circle",
        href: routes.settingsHelp,
      },
      { title: COPY.settingsOpenAbout, icon: "info", href: routes.settingsAbout },
    ],
  },
];

/** Settings hub — reached from the menu drawer, with a normal back button. */
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
    <Screen scroll>
      <ScreenHeader
        title={COPY.settingsTitle}
        subtitle={COPY.settingsBody}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      {GROUPS.map((group, groupIndex) => (
        <View
          key={group.label}
          style={groupIndex === 0 ? undefined : styles.groupGap}
        >
          <Text style={styles.groupLabel}>{group.label}</Text>
          <Card padded={false} style={styles.card}>
            {group.links.map((link, index) => (
              <ListRow
                key={link.title}
                label={link.title}
                icon={link.icon}
                divider={index < group.links.length - 1}
                onPress={() => router.push(link.href)}
              />
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.trust}>
        <TrustBanner />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupGap: {
    // Section 10: 40px between distinct sections.
    marginTop: Gap.sections,
  },
  groupLabel: {
    ...typeStyle("label"),
    marginBottom: Space.sm,
    marginLeft: Space.xs,
    letterSpacing: 0.8,
    color: Colors.muted,
  },
  card: {
    paddingHorizontal: Space.cardPad,
    paddingVertical: Space.xs,
  },
  trust: {
    marginTop: Gap.sections,
  },
});
