import { Stack } from "expo-router";

import { Colors, Motion } from "@/lib/theme";

/** Store catalog, product detail, cart, and checkout. Navigation is menu + back button. */
export default function StoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Section 9 motion: slide, ~300ms, ease-out.
        animation: "slide_from_right",
        animationDuration: Motion.screen,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
