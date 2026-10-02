import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDrawer } from "@/components/navigation/DrawerContext";
import { ListRow } from "@/components/ui/ListRow";
import { COPY } from "@/lib/copy";
import {
  DEFAULT_MENU_ORDER,
  menuItemIsActive,
  orderedMenuItems,
  type MenuItemId,
} from "@/lib/menu";
import {
  Colors,
  Font,
  Gap,
  Motion,
  Radius,
  Shadow,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

const ORDER_KEY = (userId: string) => `prescope:menu-order:${userId}`;

/** Drawer covers ~82% of the screen width (Section 7.2). */
const WIDTH_RATIO = 0.82;

type MenuDrawerProps = {
  /** Unread count for the Notifications row badge (0 = hidden). */
  unreadCount?: number;
};

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) {
    return "?";
  }
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

/**
 * The menu drawer (Section 7.2): slides in from the right over a dimmed
 * backdrop, warm #FDFAF8 panel, avatar + name + email at the top, roomy rows,
 * then a divider and a red "Log out".
 *
 * PLAIN ENGLISH: this replaces the old bottom tab bar. Open it with
 * useDrawer().openDrawer() — the menu button on Home already does that.
 */
export function MenuDrawer({ unreadCount = 0 }: MenuDrawerProps) {
  const { open, closeDrawer } = useDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const [order, setOrder] = useState<MenuItemId[]>(DEFAULT_MENU_ORDER);
  const reduceMotion = useReducedMotion();

  const panelWidth = Math.min(Math.round(width * WIDTH_RATIO), 420);
  const progress = useSharedValue(0);

  // Keep the Modal mounted through the closing animation so the panel slides
  // out instead of vanishing. Mounting is derived from `open` during render;
  // unmounting waits for the slide-out to finish.
  const [visible, setVisible] = useState(open);
  if (open && !visible) {
    setVisible(true);
  }

  useEffect(() => {
    const duration = reduceMotion ? 0 : Motion.drawer;
    progress.value = withTiming(
      open ? 1 : 0,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && !open) {
          runOnJS(setVisible)(false);
        }
      },
    );
  }, [open, progress, reduceMotion]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * panelWidth }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

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
        // Keep the default order — a bad cache must never break the menu.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const items = useMemo(() => orderedMenuItems(order), [order]);

  const go = useCallback(
    (href: Parameters<typeof router.push>[0]) => {
      closeDrawer();
      // Let the drawer finish closing before the screen pushes.
      setTimeout(() => {
        try {
          router.push(href);
        } catch {
          // Navigation failures should never crash the shell.
        }
      }, 120);
    },
    [closeDrawer, router],
  );

  const handleSignOut = useCallback(() => {
    closeDrawer();
    setTimeout(() => {
      void (async () => {
        try {
          await signOut();
        } catch {
          // The auth store already surfaces a friendly message.
        }
      })();
    }, 120);
  }, [closeDrawer, signOut]);

  const email = session?.user.email ?? "";
  const metadata = session?.user.user_metadata as
    | { full_name?: string }
    | undefined;
  const fullName = metadata?.full_name ?? "";
  const displayName = fullName.trim() || COPY.appName;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={styles.backdropHit}
            accessibilityRole="button"
            accessibilityLabel={COPY.drawerClose}
            onPress={closeDrawer}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            Shadow.lift,
            { width: panelWidth },
            panelStyle,
          ]}
        >
          <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
            <View style={styles.header}>
              <View style={styles.identity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initialsFrom(fullName, email)}
                  </Text>
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {email ? (
                    <Text style={styles.email} numberOfLines={1}>
                      {email}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={COPY.drawerClose}
                onPress={closeDrawer}
                style={styles.closeHit}
              >
                <Feather name="x" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, index) => {
                const active = menuItemIsActive(item, pathname);
                const showBadge =
                  item.id === "notifications" && unreadCount > 0;
                return (
                  <ListRow
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                    divider={index < items.length - 1}
                    paddingY={Space.xs + 14}
                    onPress={() => go(item.href)}
                    value={
                      showBadge
                        ? unreadCount > 9
                          ? "9+"
                          : String(unreadCount)
                        : active
                          ? COPY.drawerCurrent
                          : undefined
                    }
                  />
                );
              })}
            </ScrollView>

            <View style={styles.divider} />
            <ListRow
              label={COPY.signOut}
              icon="log-out"
              destructive
              divider={false}
              chevron={false}
              paddingY={Space.xs + 14}
              onPress={handleSignOut}
            />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(31,27,24,0.38)",
  },
  backdropHit: {
    flex: 1,
  },
  panel: {
    height: "100%",
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.sheet,
    borderBottomLeftRadius: Radius.sheet,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
    paddingTop: Space.lg,
    paddingBottom: Space.lg,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md - 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typeStyle("section"),
    color: Colors.white,
  },
  identityText: {
    flex: 1,
  },
  /** Name in the Fraunces serif, per Section 7.2. */
  name: {
    fontFamily: Font.serif,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: Colors.ink,
  },
  email: {
    ...typeStyle("caption"),
    marginTop: 2,
    color: Colors.muted,
  },
  closeHit: {
    width: Size.tap,
    height: Size.tap,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Space.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginTop: Gap.labelToField,
  },
});
