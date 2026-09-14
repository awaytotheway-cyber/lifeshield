/**
 * Side-drawer menu items. Routes map to real screens or honest empty shells.
 * Optional reorder: persist ordered ids in AsyncStorage (see AppDrawer).
 */
import type { Href } from "expo-router";
import type { Feather } from "@expo/vector-icons";

import { routes } from "@/lib/routes";

export type MenuItemId =
  | "home"
  | "plan"
  | "appointments"
  | "results"
  | "prescriptions"
  | "shop"
  | "notifications"
  | "profile"
  | "settings";

export type MenuItem = {
  id: MenuItemId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: Href;
  /** Match pathname snippets to highlight the active row. */
  match: string[];
};

export const DEFAULT_MENU_ORDER: MenuItemId[] = [
  "home",
  "plan",
  "appointments",
  "results",
  "prescriptions",
  "shop",
  "notifications",
  "profile",
  "settings",
];

export const MENU_ITEMS: Record<MenuItemId, MenuItem> = {
  home: {
    id: "home",
    label: "Home",
    icon: "home",
    href: routes.home,
    match: ["/home"],
  },
  plan: {
    id: "plan",
    label: "My Plan",
    icon: "map",
    href: routes.plan,
    match: ["/plan"],
  },
  appointments: {
    id: "appointments",
    label: "Appointments",
    icon: "calendar",
    href: routes.appointments,
    match: ["appointments"],
  },
  results: {
    id: "results",
    label: "Test Results",
    icon: "activity",
    href: routes.labResults,
    match: ["results", "lab-results"],
  },
  prescriptions: {
    id: "prescriptions",
    label: "Prescriptions",
    icon: "file-text",
    href: routes.prescriptions,
    match: ["prescriptions"],
  },
  shop: {
    id: "shop",
    label: "Shop",
    icon: "shopping-bag",
    href: routes.store,
    match: ["/store", "(store)"],
  },
  notifications: {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    href: routes.notificationsInbox,
    match: ["notifications-inbox", "notif-inbox"],
  },
  profile: {
    id: "profile",
    label: "Profile",
    icon: "user",
    href: routes.profile,
    match: ["/profile"],
  },
  settings: {
    id: "settings",
    label: "Settings",
    icon: "settings",
    href: routes.settings,
    match: ["/(settings)", "/settings"],
  },
};

export function orderedMenuItems(order: MenuItemId[]): MenuItem[] {
  const seen = new Set<MenuItemId>();
  const list: MenuItem[] = [];
  for (const id of order) {
    if (MENU_ITEMS[id] && !seen.has(id)) {
      list.push(MENU_ITEMS[id]);
      seen.add(id);
    }
  }
  for (const id of DEFAULT_MENU_ORDER) {
    if (!seen.has(id)) {
      list.push(MENU_ITEMS[id]);
    }
  }
  return list;
}

export function menuItemIsActive(item: MenuItem, pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (item.id === "settings") {
    const settingsLeaves = [
      "notifications",
      "privacy",
      "help",
      "about",
      "delete-account",
      "consents",
    ];
    if (settingsLeaves.some((leaf) => path.includes(leaf) && !path.includes("notifications-inbox"))) {
      return true;
    }
    // Settings hub (More tab index) — groups are often omitted from pathname.
    if (
      path.includes("(settings)") ||
      path.endsWith("/settings") ||
      path === "/(main)/(settings)"
    ) {
      return !path.includes("profile") && !path.includes("appointments") && !path.includes("prescriptions");
    }
    return false;
  }
  if (item.id === "profile") {
    return path.includes("/profile") || path.endsWith("profile");
  }
  if (item.id === "results") {
    return path.includes("results") || path.includes("lab-results");
  }
  if (item.id === "home") {
    return path.includes("/home") || path.endsWith("home");
  }
  if (item.id === "notifications") {
    return path.includes("notifications-inbox");
  }
  return item.match.some((snippet) => path.includes(snippet.toLowerCase()));
}
