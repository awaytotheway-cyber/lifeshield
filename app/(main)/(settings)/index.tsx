import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { MenuButton } from "@/components/navigation/MenuButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { colors, spacing, tapTarget } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

type LinkRow = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
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
    <Screen scroll contentPadding={spacing.screenX}>
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

      <GlassCard intensity="card" style={styles.card}>
        {LINKS.map((link) => (
          <Pressable
            key={link.title}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            onPress={() => router.push(link.href)}
            style={styles.row}
          >
            <Feather name={link.icon} size={20} color={colors.primaryBlue} />
            <Text style={styles.rowLabel}>{link.title}</Text>
            <Feather name="chevron-right" size={20} color={colors.mist} />
          </Pressable>
        ))}
      </GlassCard>
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
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.deepTeal,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  banner: {
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  row: {
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: colors.charcoal,
  },
});
