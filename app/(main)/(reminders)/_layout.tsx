import { Stack } from "expo-router";

/** User-defined reminders — list, create, detail. Hidden from the tab bar. */
export default function RemindersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
