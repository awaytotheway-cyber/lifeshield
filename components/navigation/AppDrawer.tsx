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
import { Icon } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDrawer } from "@/components/navigation/DrawerContext";
import { Sheet } from "@/components/specimen/Sheet";
import { COPY } from "@/lib/copy";
import {
  DEFAULT_MENU_ORDER,
  menuItemIsActive,
  orderedMenuItems,
  type MenuItemId,
} from "@/lib/menu";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, SpecimenType, tapTarget } from "@/lib/specimen-tokens";

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

  const items = useMemo(() => orderedMenuItems(order), [order]);

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
          <Sheet variant="sheet" style={styles.panel}>
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
                  <Icon name="x" size={22} color={Ink.full} />
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
                        <Icon
                          name={item.icon}
                          size={20}
                          color={
                            active ? Accent.tag : Ink.full
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
                            <Icon
                              name="chevron-up"
                              size={20}
                              color={Ink.soft}
                            />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${item.label} down`}
                            onPress={() => moveItem(item.id, 1)}
                            style={styles.iconHit}
                          >
                            <Icon
                              name="chevron-down"
                              size={20}
                              color={Ink.soft}
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
                <Icon
                  name={reorderMode ? "check" : "list"}
                  size={18}
                  color={Accent.tag}
                />
                <Text style={styles.reorderToggleText}>
                  {reorderMode
                    ? COPY.drawerReorderDone
                    : COPY.drawerReorder}
                </Text>
              </Pressable>
            </SafeAreaView>
          </Sheet>
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
    backgroundColor: Ink.scrim,
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
    borderTopRightRadius: Edge.mount,
    borderBottomRightRadius: Edge.mount,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Measure.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Measure.tight,
  },
  brand: {
    fontFamily: SpecimenType.serif,
    fontSize: 28,
    letterSpacing: -0.5,
    color: Accent.tag,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
  },
  list: {
    flex: 1,
    marginTop: Measure.base,
  },
  listContent: {
    paddingBottom: Measure.loose,
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
    borderRadius: Edge.none,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: Accent.tagWash,
  },
  itemLabel: {
    flex: 1,
    fontFamily: SpecimenType.mono,
    fontSize: 18,
    color: Ink.full,
  },
  itemLabelActive: {
    color: Accent.tag,
    fontFamily: SpecimenType.monoBold,
  },
  currentHint: {
    fontFamily: SpecimenType.mono,
    fontSize: 13,
    color: Accent.tag,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Accent.ochre,
  },
  badgeText: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 13,
    color: Ink.full,
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
    paddingVertical: Measure.tight,
    marginBottom: Measure.tight,
  },
  reorderToggleText: {
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    color: Accent.tag,
  },
});
