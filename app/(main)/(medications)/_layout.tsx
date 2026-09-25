import { Stack } from "expo-router";

/** Medications register. Hidden from the tab bar. */
export default function MedicationsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
