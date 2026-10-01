import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Typography } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";

type TabId = "home" | "journey" | "results" | "plan" | "more";

type TabSpec = {
  id: TabId;
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
    match: (p) => p.includes("/home"),
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
    href: routes.results as string,
    match: (p) => p.includes("(results)") || p.includes("/results"),
  },
  {
    id: "plan",
    label: "Plan",
    icon: "list",
    href: routes.plan as string,
    match: (p) => p.includes("(plan)") || p.includes("/plan"),
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
 * PRESCOPE v2 bottom tab bar. Translucent white, blurred, with an
 * orange pill above the active tab's icon — the above-icon pill is the
 * key differentiator from a default-colour tabbar.
 */
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const go = async (tab: TabSpec) => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.selectionAsync();
      } catch {
        // non-fatal
      }
    }
    router.navigate(tab.href as never);
  };

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
            const active = tab.match(pathname || "");
            const color = active ? Colors.orangeDark : Colors.mutedText;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                onPress={() => void go(tab)}
                style={styles.tab}
              >
                <View style={styles.pillRow}>
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active
                          ? Colors.orangeDark
                          : "transparent",
                      },
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  whiteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.60)",
  },
  safe: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 4,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  pillRow: {
    height: 6,
    width: 20,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  label: {
    marginTop: 2,
    fontFamily: Typography.semibold,
    fontSize: 12,
  },
});
