import { Stack } from "expo-router";

import { Colors, Motion } from "@/lib/theme";

/** Follow-up list + symptom re-check. */
export default function FollowUpLayout() {
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
