import { Stack } from "expo-router";

/** Follow-up list + symptom re-check. Hidden from the tab bar. */
export default function FollowUpLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
