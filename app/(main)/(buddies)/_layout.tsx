import { Stack } from "expo-router";

/** Accountability buddies stack. Hidden from the tab bar. */
export default function BuddiesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
