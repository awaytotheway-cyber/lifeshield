import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDrawer } from "@/components/navigation/DrawerContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagName,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import {
  DEFAULT_MENU_ORDER,
  filterMenuItemsByFlags,
  menuItemIsActive,
  orderedMenuItems,
  type MenuItemId,
} from "@/lib/menu";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

const ORDER_KEY = (userId: string) => `prescope:menu-order:${userId}`;

type AppDrawerProps = {
  /** Unread count for the Notifications row badge (0 = hidden). */
  unreadCount?: number;
};

/**
 * Side drawer overlay — keeps Tabs journey routing intact.
 * Open via useDrawer().openDrawer() from Home / More / menu button.
 */
export function AppDrawer({ unreadCount = 0 }: AppDrawerProps) {
  const { open, closeDrawer } = useDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((state) => state.session);
  const [order, setOrder] = useState<MenuItemId[]>(DEFAULT_MENU_ORDER);
  const [reorderMode, setReorderMode] = useState(false);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);
  const slide = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(ORDER_KEY(userId));
        if (cancelled || !raw) {
          return;
        }
        const parsed = JSON.parse(raw) as MenuItemId[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrder(parsed);
        }
      } catch {
        // Keep default order.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -320,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  // Read the profile's feature_flags once per sign-in so the drawer can hide
  // rows the account isn't in the beta cohort for. A failed lookup leaves
  // profile null; the flag helper then falls back to the compile-time default
  // (off), which matches how other flag-gated surfaces behave.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !isSupabaseConfigured) {
      return;
    }
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("feature_flags")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const isFlagOn = useCallback(
    (flag: FeatureFlagName) =>
      profile === null
        ? FEATURE_FLAG_DEFAULTS[flag]
        : isFeatureEnabled(profile, flag),
    [profile],
  );

  const items = useMemo(
    () => filterMenuItemsByFlags(orderedMenuItems(order), isFlagOn),
    [order, isFlagOn],
  );

  const persistOrder = useCallback(
    async (next: MenuItemId[]) => {
      setOrder(next);
      const userId = session?.user.id;
      if (!userId) {
        return;
      }
      try {
        await AsyncStorage.setItem(ORDER_KEY(userId), JSON.stringify(next));
      } catch {
        // Non-fatal.
      }
    },
    [session?.user.id],
  );

  const moveItem = (id: MenuItemId, direction: -1 | 1) => {
    const index = order.indexOf(id);
    if (index < 0) {
      return;
    }
    const target = index + direction;
    if (target < 0 || target >= order.length) {
      return;
    }
    const next = [...order];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    void persistOrder(next);
  };

  const go = (href: Parameters<typeof router.push>[0]) => {
    closeDrawer();
    // Slight delay so the modal closes before navigation.
    setTimeout(() => {
      try {
        router.push(href);
      } catch {
        // Navigation failures should not crash the shell.
      }
    }, 80);
  };

  return (
    <Modal
      visible={open}
      animationType="none"
      transparent
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel={COPY.drawerClose}
          onPress={closeDrawer}
        />
        <Animated.View
          style={[styles.panelWrap, { transform: [{ translateX: slide }] }]}
        >
          <GlassCard intensity="sheet" style={styles.panel}>
            <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
              <View style={styles.header}>
                <Text style={styles.brand} accessibilityRole="header">
                  PRESCOPE
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={COPY.drawerClose}
                  onPress={closeDrawer}
                  style={styles.iconHit}
                >
                  <Feather name="x" size={22} color={colors.charcoal} />
                </Pressable>
              </View>
              <Text style={styles.subtitle}>{COPY.drawerSubtitle}</Text>

              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {items.map((item) => {
                  const active = menuItemIsActive(item, pathname);
                  const showBadge =
                    item.id === "notifications" && unreadCount > 0;
                  return (
                    <View key={item.id} style={styles.row}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={
                          showBadge
                            ? `${item.label}, ${unreadCount} unread`
                            : item.label
                        }
                        onPress={() => go(item.href)}
                        style={[
                          styles.item,
                          active ? styles.itemActive : null,
                        ]}
                      >
                        <Feather
                          name={item.icon}
                          size={20}
                          color={
                            active ? colors.primaryBlue : colors.charcoal
                          }
                        />
                        <Text
                          style={[
                            styles.itemLabel,
                            active ? styles.itemLabelActive : null,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {showBadge ? (
                          <View
                            style={styles.badge}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            <Text style={styles.badgeText}>
                              {unreadCount > 9 ? "9+" : String(unreadCount)}
                            </Text>
                          </View>
                        ) : null}
                        {active ? (
                          <Text style={styles.currentHint}>
                            {COPY.drawerCurrent}
                          </Text>
                        ) : null}
                      </Pressable>
                      {reorderMode ? (
                        <View style={styles.reorder}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${item.label} up`}
                            onPress={() => moveItem(item.id, -1)}
                            style={styles.iconHit}
                          >
                            <Feather
                              name="chevron-up"
                              size={20}
                              color={colors.slate}
                            />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${item.label} down`}
                            onPress={() => moveItem(item.id, 1)}
                            style={styles.iconHit}
                          >
                            <Feather
                              name="chevron-down"
                              size={20}
                              color={colors.slate}
                            />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  reorderMode
                    ? COPY.drawerReorderDone
                    : COPY.drawerReorder
                }
                onPress={() => setReorderMode((prev) => !prev)}
                style={styles.reorderToggle}
              >
                <Feather
                  name={reorderMode ? "check" : "list"}
                  size={18}
                  color={colors.primaryBlue}
                />
                <Text style={styles.reorderToggleText}>
                  {reorderMode
                    ? COPY.drawerReorderDone
                    : COPY.drawerReorder}
                </Text>
              </Pressable>
            </SafeAreaView>
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(11,30,77,0.35)",
  },
  panelWrap: {
    width: 300,
    maxWidth: "86%",
    height: "100%",
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  brand: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    letterSpacing: -0.5,
    color: colors.primaryBlue,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  list: {
    flex: 1,
    marginTop: spacing.base,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    flex: 1,
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.input,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: colors.lightTeal,
  },
  itemLabel: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: colors.charcoal,
  },
  itemLabelActive: {
    color: colors.primaryBlue,
    fontFamily: fontFamily.bodySemi,
  },
  currentHint: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.primaryBlue,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.amber,
  },
  badgeText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: colors.deepNavy,
  },
  reorder: {
    flexDirection: "column",
  },
  iconHit: {
    width: tapTarget,
    height: tapTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderToggle: {
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  reorderToggleText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.primaryBlue,
  },
});
