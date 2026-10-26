import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "@/lib/design-tokens";

export type TabIconName = "home" | "tests" | "shop" | "buddies" | "more";

type TabIconProps = {
  name: TabIconName;
  focused: boolean;
};

/** 22x22 box, 1.5px stroke — the only icon weight in the tab bar. */
const SIZE = 22;
const STROKE = 1.5;

/**
 * The five tab-bar glyphs, line-drawn at 1.5px in a 22x22 box.
 *
 * Every path below is copied verbatim from the `<nav>` markup in the design
 * boards (boards/home.html and the "Tab bar" row of boards/ui-kit.html) — the
 * boards are the source of truth for the geometry, so do not redraw these by
 * eye. The boards' `sc-camel-view-box` attribute is `viewBox` here.
 *
 * Colour is the only thing that changes with state: `ink` when focused,
 * `inkFaint` otherwise. No pill, no fill, no badge.
 */
export function TabIcon({ name, focused }: TabIconProps) {
  const stroke = focused ? colors.ink : colors.inkFaint;

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none">
      {name === "home" ? (
        <Path
          d="M3 9l8-6 8 6v9a1 1 0 01-1 1h-4v-6H8v6H4a1 1 0 01-1-1V9z"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      ) : null}

      {name === "tests" ? (
        <Path
          d="M7 3h8a1 1 0 011 1v15l-5-3-5 3V4a1 1 0 011-1z"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      ) : null}

      {name === "shop" ? (
        <Path
          d="M4 7h14l-1 11H5L4 7zm3 0a4 4 0 118 0"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      ) : null}

      {name === "buddies" ? (
        <>
          <Circle cx={8} cy={7} r={3} stroke={stroke} strokeWidth={STROKE} />
          <Path
            d="M2.5 18c.6-3 2.9-4.5 5.5-4.5S13 15 13.6 18M15 8.5a2.5 2.5 0 100-5M16 13.6c2 .5 3.3 1.9 3.8 4.4"
            stroke={stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {name === "more" ? (
        <Path
          d="M3 5h16M3 11h16M3 17h10"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}
