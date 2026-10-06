import { Ionicons } from "@expo/vector-icons";
import type { ColorValue, StyleProp, TextStyle } from "react-native";

/**
 * The app's icon set.
 *
 * Ionicons is Apple's own icon family, so this is what gives the app an
 * iPhone-native feel. Everything goes through this component rather than
 * importing Ionicons directly, for three reasons:
 *
 *  - one place decides the outline/filled convention, so a screen cannot end
 *    up mixing styles at the same hierarchy level;
 *  - call sites keep stable, meaningful names ("lock", "calendar") instead of
 *    vendor spellings like "lock-closed-outline";
 *  - swapping sets again later is a change to this file, not to 28 files.
 *
 * Outline is the default, matching iOS. Pass `filled` for an active state,
 * such as the selected tab.
 */
const OUTLINE = {
  activity: "pulse-outline",
  "alert-triangle": "warning-outline",
  // iOS goes back with a chevron, not an arrow.
  "arrow-left": "chevron-back",
  "bar-chart-2": "bar-chart-outline",
  bell: "notifications-outline",
  "book-open": "book-outline",
  calendar: "calendar-outline",
  check: "checkmark",
  "check-circle": "checkmark-circle-outline",
  "chevron-down": "chevron-down",
  "chevron-up": "chevron-up",
  circle: "ellipse-outline",
  "chevron-right": "chevron-forward",
  clipboard: "clipboard-outline",
  coffee: "cafe-outline",
  droplet: "water-outline",
  eye: "eye-outline",
  "eye-off": "eye-off-outline",
  compass: "compass-outline",
  cpu: "hardware-chip-outline",
  "file-text": "document-text-outline",
  grid: "grid-outline",
  "help-circle": "help-circle-outline",
  home: "home-outline",
  inbox: "file-tray-outline",
  info: "information-circle-outline",
  list: "list-outline",
  lock: "lock-closed-outline",
  map: "map-outline",
  "message-circle": "chatbubble-outline",
  menu: "menu-outline",
  minus: "remove",
  "more-horizontal": "ellipsis-horizontal",
  package: "cube-outline",
  "play-circle": "play-circle-outline",
  "refresh-cw": "refresh-outline",
  plus: "add",
  search: "search-outline",
  settings: "settings-outline",
  shield: "shield-checkmark-outline",
  "shopping-bag": "bag-outline",
  star: "star-outline",
  sun: "sunny-outline",
  target: "locate-outline",
  "toggle-right": "toggle-outline",
  user: "person-outline",
  "user-check": "person-add-outline",
  users: "people-outline",
  x: "close",
} as const;

export type IconName = keyof typeof OUTLINE;

/** Filled counterparts, used for active states. */
const FILLED: Partial<Record<IconName, string>> = {
  activity: "pulse",
  "alert-triangle": "warning",
  "bar-chart-2": "bar-chart",
  bell: "notifications",
  "book-open": "book",
  calendar: "calendar",
  "check-circle": "checkmark-circle",
  clipboard: "clipboard",
  circle: "ellipse",
  coffee: "cafe",
  droplet: "water",
  eye: "eye",
  "eye-off": "eye-off",
  compass: "compass",
  cpu: "hardware-chip",
  "file-text": "document-text",
  grid: "grid",
  "help-circle": "help-circle",
  home: "home",
  inbox: "file-tray",
  info: "information-circle",
  list: "list",
  lock: "lock-closed",
  map: "map",
  menu: "menu",
  "message-circle": "chatbubble",
  package: "cube",
  "play-circle": "play-circle",
  "refresh-cw": "refresh",
  search: "search",
  settings: "settings",
  shield: "shield-checkmark",
  "shopping-bag": "bag",
  star: "star",
  sun: "sunny",
  target: "locate",
  user: "person",
  "user-check": "person-add",
  users: "people",
};

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** Use the solid variant — active tab, selected row. */
  filled?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 24, color, filled = false, style }: IconProps) {
  const glyph = (filled && FILLED[name]) || OUTLINE[name];
  return (
    <Ionicons
      name={glyph as never}
      size={size}
      color={color as string | undefined}
      style={style}
      // Decorative by default: a meaningful icon's label belongs on the
      // control that wraps it, not on the glyph.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
