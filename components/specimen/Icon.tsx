import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

import {
  SpecimenIcon,
  type SpecimenIconName,
} from "@/components/specimen/SpecimenIcon";
import { Ink } from "@/lib/specimen-tokens";

/**
 * The app's icon lookup — every name resolves to a PRESCOPE glyph.
 *
 * Screens refer to icons by a stable semantic name. There is no vendor
 * icon set behind this any more and no fallthrough: if a name is not
 * drawn, that is a compile error rather than a Feather glyph quietly
 * appearing in the middle of a hand-drawn set.
 */

const MAP = {
  // Navigation
  home: "sheet",
  map: "survey",
  compass: "compass",
  menu: "index",
  list: "slip",
  grid: "compass",
  "chevron-left": "chevronLeft",
  "chevron-right": "chevronRight",
  "chevron-down": "chevronDown",
  "chevron-up": "chevronUp",
  "arrow-left": "chevronLeft",
  "arrow-right": "chevronRight",

  // Actions
  check: "check",
  "check-circle": "check",
  plus: "plus",
  minus: "minus",
  x: "cross",
  search: "lens",
  bell: "bell",
  lock: "lock",
  shield: "lock",
  camera: "camera",
  "edit-3": "nib",
  "edit-2": "nib",
  edit: "nib",
  settings: "dial",
  star: "star",
  flag: "tag",

  // Notices
  info: "note",
  "help-circle": "query",
  help: "query",
  "alert-triangle": "caution",
  "alert-circle": "caution",

  // Domain
  activity: "vial",
  "bar-chart-2": "vial",
  droplet: "droplet",
  heart: "heart",
  "file-text": "slip",
  clipboard: "slip",
  calendar: "calendar",
  target: "seedling",
  users: "pair",
  user: "pair",
  "user-check": "pair",
  "book-open": "mortar",
  coffee: "mortar",
  package: "tag",
  tag: "tag",
  "shopping-bag": "tag",
  "toggle-right": "key",
  key: "key",
  sun: "seedling",
  feather: "seedling",
  cpu: "press",
  circle: "ring",
  "play-circle": "advance",
  "more-horizontal": "ellipsis",
  inbox: "tray",
  "message-circle": "letter",
  "refresh-cw": "recur",
  eye: "eye",
  "eye-off": "eyeShut",
} as const satisfies Record<string, SpecimenIconName>;

export type IconName = keyof typeof MAP;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 24, color = Ink.full, style }: IconProps) {
  const glyph = <SpecimenIcon name={MAP[name]} size={size} color={color} />;
  return style ? <View style={style}>{glyph}</View> : glyph;
}
