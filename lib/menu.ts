/**
 * Side-drawer menu items. Routes map to real screens or honest empty shells.
 * Optional reorder: persist ordered ids in AsyncStorage (see AppDrawer).
 */
import type { Href } from "expo-router";
import type { Feather } from "@expo/vector-icons";

import type { FeatureFlagName } from "@/lib/feature-flags";
import { routes } from "@/lib/routes";

export type MenuItemId =
  | "home"
  | "plan"
  | "appointments"
  | "results"
  | "prescriptions"
  | "shop"
  | "goals"
  | "reminders"
  | "recipes"
  | "meal_plans"
  | "book_test"
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
  /**
   * When set, the drawer hides this row unless the current user's feature
   * flags have this one enabled. Keeps in-development features out of the
   * drawer for accounts that aren't in the beta cohort.
   */
  requiresFlag?: FeatureFlagName;
};

export const DEFAULT_MENU_ORDER: MenuItemId[] = [
  "home",
  "plan",
  "appointments",
  "results",
  "prescriptions",
  "shop",
  "recipes",
  "meal_plans",
  "book_test",
  "goals",
  "reminders",
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
  goals: {
    id: "goals",
    label: "Goals",
    icon: "target",
    href: routes.goals,
    match: ["/goals", "(goals)"],
    requiresFlag: "goals_v1",
  },
  reminders: {
    id: "reminders",
    label: "Reminders",
    icon: "clock",
    href: routes.reminders,
    match: ["/reminders", "(reminders)"],
    requiresFlag: "reminders_v1",
  },
  recipes: {
    id: "recipes",
    label: "Recipes",
    icon: "book-open",
    href: routes.recipes,
    match: ["/recipes", "(recipes)"],
    requiresFlag: "recipes_v1",
  },
  meal_plans: {
    id: "meal_plans",
    label: "Meal plans",
    icon: "grid",
    href: routes.mealPlans,
    match: ["/meal-plans", "(meal-plans)"],
    requiresFlag: "meal_planner_v1",
  },
  book_test: {
    id: "book_test",
    label: "Book a test",
    icon: "clipboard",
    href: routes.ordersBook,
    match: ["/book", "orders/book"],
    requiresFlag: "test_booking_v1",
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

/**
 * Drop menu rows whose requiresFlag isn't on for the caller. Items without
 * a requiresFlag pass through unchanged, so this is a no-op for the stable
 * part of the menu.
 */
export function filterMenuItemsByFlags(
  items: readonly MenuItem[],
  isEnabled: (flag: FeatureFlagName) => boolean,
): MenuItem[] {
  return items.filter(
    (item) => !item.requiresFlag || isEnabled(item.requiresFlag),
  );
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
  if (item.id === "goals") {
    return path.includes("/goals") || path.includes("(goals)");
  }
  if (item.id === "reminders") {
    return path.includes("/reminders") || path.includes("(reminders)");
  }
  if (item.id === "recipes") {
    return path.includes("/recipes") || path.includes("(recipes)");
  }
  if (item.id === "meal_plans") {
    return path.includes("/meal-plans") || path.includes("(meal-plans)");
  }
  if (item.id === "book_test") {
    return path.includes("orders/book") || path.endsWith("/book");
  }
  return item.match.some((snippet) => path.includes(snippet.toLowerCase()));
}
