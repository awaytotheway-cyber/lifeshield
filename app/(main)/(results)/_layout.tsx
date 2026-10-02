import { Stack } from "expo-router";

import { Colors, Motion } from "@/lib/theme";

/** Suggested tests (index) plus lab dashboard / detail / admin entry. */
export default function ResultsLayout() {
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
