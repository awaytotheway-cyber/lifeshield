/**
 * Menu-drawer items (Section 7.2 of .cursorrules-redesign).
 *
 * PLAIN ENGLISH: this is the list you see when you tap the menu button on Home.
 * To rename a row, change its `label`. To reorder the default list, reorder
 * DEFAULT_MENU_ORDER. Every `href` points at a real screen in lib/routes.ts —
 * please keep it that way so no row is a dead end.
 *
 * The first eleven items are the brief's list, in the brief's order. The items
 * after them are extra PRESCOPE features that already exist; they live below so
 * no functionality is lost.
 */
import type { Href } from "expo-router";
import type { Feather } from "@expo/vector-icons";

import { routes } from "@/lib/routes";

export type MenuItemId =
  | "journey"
  | "results"
  | "plan"
  | "orders"
  | "appointments"
  | "shop"
  | "goals"
  | "recipes"
  | "profile"
  | "settings"
  | "help"
  | "home"
  | "buddies"
  | "partners"
  | "plugins"
  | "notifications"
  | "prescriptions";

export type MenuItem = {
  id: MenuItemId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: Href;
  /** Match pathname snippets to highlight the active row. */
  match: string[];
};

export const DEFAULT_MENU_ORDER: MenuItemId[] = [
  // ——— Section 7.2 list, in order ———
  "journey",
  "results",
  "plan",
  "orders",
  "appointments",
  "shop",
  "goals",
  "recipes",
  "profile",
  "settings",
  "help",
  // ——— Extra existing PRESCOPE features, kept below ———
  "home",
  "buddies",
  "partners",
  "plugins",
  "notifications",
  "prescriptions",
];

export const MENU_ITEMS: Record<MenuItemId, MenuItem> = {
  journey: {
    id: "journey",
    label: "My Journey",
    icon: "map",
    href: routes.journey,
    match: ["/journey", "(journey)", "/questionnaire"],
  },
  results: {
    id: "results",
    label: "My Results",
    icon: "bar-chart-2",
    href: routes.labResults,
    match: ["results", "lab-results"],
  },
  plan: {
    id: "plan",
    label: "My Plan",
    icon: "list",
    href: routes.plan,
    match: ["/plan", "(plan)"],
  },
  orders: {
    id: "orders",
    label: "My Orders",
    icon: "shopping-bag",
    href: routes.orders,
    match: ["/orders", "(orders)"],
  },
  appointments: {
    id: "appointments",
    label: "Appointments",
    icon: "calendar",
    href: routes.appointments,
    match: ["appointments"],
  },
  shop: {
    id: "shop",
    label: "Shop",
    icon: "grid",
    href: routes.store,
    match: ["/store", "(store)"],
  },
  goals: {
    id: "goals",
    label: "Weekly Goals",
    icon: "target",
    href: routes.goals,
    match: ["/goals", "(goals)"],
  },
  recipes: {
    id: "recipes",
    label: "Recipes",
    icon: "coffee",
    href: routes.recipes,
    match: ["/recipes", "(recipes)"],
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
  help: {
    id: "help",
    label: "Help & Support",
    icon: "help-circle",
    href: routes.settingsHelp,
    match: ["/help"],
  },
  home: {
    id: "home",
    label: "Home",
    icon: "home",
    href: routes.home,
    match: ["/home"],
  },
  buddies: {
    id: "buddies",
    label: "Buddies",
    icon: "users",
    href: routes.buddies,
    match: ["/buddies", "(buddies)"],
  },
  partners: {
    id: "partners",
    label: "Partner apps",
    icon: "activity",
    href: routes.partners,
    match: ["/partners", "(partners)"],
  },
  plugins: {
    id: "plugins",
    label: "Plugins",
    icon: "toggle-right",
    href: routes.plugins,
    match: ["/plugins", "(plugins)"],
  },
  notifications: {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    href: routes.notificationsInbox,
    match: ["notifications-inbox", "notif-inbox"],
  },
  prescriptions: {
    id: "prescriptions",
    label: "Prescriptions",
    icon: "file-text",
    href: routes.prescriptions,
    match: ["prescriptions"],
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
  if (item.id === "help") {
    return path.includes("/help");
  }
  if (item.id === "settings") {
    const settingsLeaves = [
      "notifications",
      "privacy",
      "about",
      "delete-account",
      "consents",
    ];
    if (
      settingsLeaves.some(
        (leaf) => path.includes(leaf) && !path.includes("notifications-inbox"),
      )
    ) {
      return true;
    }
    // Settings hub — groups are often omitted from pathname.
    if (
      path.includes("(settings)") ||
      path.endsWith("/settings") ||
      path === "/(main)/(settings)"
    ) {
      return (
        !path.includes("profile") &&
        !path.includes("appointments") &&
        !path.includes("prescriptions") &&
        !path.includes("help")
      );
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
