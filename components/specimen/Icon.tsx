import { Feather as RawFeather } from "@expo/vector-icons";

import {
  SpecimenIcon,
  type SpecimenIconName,
} from "@/components/specimen/SpecimenIcon";
import { Ink } from "@/lib/specimen-tokens";

/**
 * Drop-in replacement for `<Feather />` backed by PRESCOPE's own glyphs.
 *
 * Screens across the app were written against Feather names. Rather
 * than rewrite 30 call sites, this shim keeps the same API and maps the
 * names we have drawn ourselves onto SpecimenIcon. Anything not yet in
 * the house set falls through to real Feather, so nothing breaks — the
 * fallback list is the to-draw queue.
 */

const MAP: Record<string, SpecimenIconName> = {
  // Navigation
  home: "sheet",
  map: "survey",
  compass: "compass",
  menu: "index",
  list: "slip",
  "chevron-left": "chevronLeft",
  "chevron-right": "chevronRight",
  "chevron-down": "chevronDown",
  "arrow-left": "chevronLeft",
  "arrow-right": "chevronRight",

  // Actions
  check: "check",
  "check-circle": "check",
  plus: "plus",
  search: "lens",
  bell: "bell",
  lock: "lock",
  shield: "lock",

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
  grid: "compass",
  "toggle-right": "key",
  key: "key",
  sun: "seedling",
  feather: "seedling",
};

type FeatherShimProps = {
  name: string;
  size?: number;
  color?: string;
  style?: unknown;
};

export function Feather({
  name,
  size = 24,
  color = Ink.full,
  style,
}: FeatherShimProps) {
  const mapped = MAP[name];
  if (mapped) {
    return <SpecimenIcon name={mapped} size={size} color={color} />;
  }
  // Not drawn yet — fall through so the screen still renders.
  return (
    <RawFeather
      name={name as never}
      size={size}
      color={color}
      style={style as never}
    />
  );
}

/** Keep the namespace shape so `keyof typeof Feather.glyphMap` still types. */
Feather.glyphMap = RawFeather.glyphMap;
