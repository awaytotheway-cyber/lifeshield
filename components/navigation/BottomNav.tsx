import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Typography } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";

type TabSpec = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  match: (pathname: string) => boolean;
};

const TABS: TabSpec[] = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    href: routes.home as string,
    match: (p) => p.includes("/home") || p.endsWith("home"),
  },
  {
    id: "journey",
    label: "Journey",
    icon: "map",
    href: routes.journey as string,
    match: (p) => p.includes("(journey)") || p.includes("/journey"),
  },
  {
    id: "results",
    label: "Results",
    icon: "bar-chart-2",
    href: routes.labResults as string,
    match: (p) => p.includes("(results)") || p.includes("results"),
  },
  {
    id: "plan",
    label: "Plan",
    icon: "list",
    href: routes.plan as string,
    match: (p) => p.includes("(plan)") || p.endsWith("/plan"),
  },
  {
    id: "more",
    label: "More",
    icon: "menu",
    href: routes.settings as string,
    match: (p) => p.includes("(settings)") || p.includes("/settings"),
  },
];

/**
 * PRESCOPE v2 bottom tab bar.
 *
 * The 4×4 orange pill sits ABOVE the active icon rather than
 * underlining the label — that small placement choice is what stops the
 * nav reading as a stock colour-swap tab bar.
 */
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const go = (tab: TabSpec) => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    router.navigate(tab.href as never);
  };

  // First match wins, so a deep results route doesn't also light up Home.
  const activeId = TABS.find((t) => t.match(pathname))?.id ?? null;

  return (
    <View style={styles.wrap}>
      <BlurView
        intensity={60}
        tint="light"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.whiteOverlay} />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <View style={styles.row}>
          {TABS.map((tab) => {
            const active = tab.id === activeId;
            const color = active ? Colors.orangeDark : Colors.mutedText;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                onPress={() => go(tab)}
                style={styles.tab}
              >
                <View style={styles.pillRow}>
                  <View
                    style={[
                      styles.pill,
                      active ? styles.pillOn : styles.pillOff,
                    ]}
                  />
                </View>
                <Feather name={tab.icon} size={22} color={color} />
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  whiteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  safe: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 2,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  pillRow: {
    height: 8,
    justifyContent: "center",
  },
  pill: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pillOn: {
    backgroundColor: Colors.orangeDark,
  },
  pillOff: {
    backgroundColor: "transparent",
  },
  label: {
    marginTop: 3,
    fontFamily: Typography.semibold,
    fontSize: Typography.label,
  },
});
