import { Stack } from "expo-router";

/** Weekly-goals stack. Hidden from the tab bar. */
export default function GoalsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
