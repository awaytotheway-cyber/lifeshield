import { Stack } from "expo-router";

import { Colors, Motion } from "@/lib/theme";

/** Personalised plan list + one-item detail. */
export default function PlanLayout() {
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
