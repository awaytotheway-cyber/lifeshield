import { Stack } from "expo-router";

/** Activity tracking — summary, log new reading. Hidden from the tab bar. */
export default function ActivityLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
