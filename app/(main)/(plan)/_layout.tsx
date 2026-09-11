import { Stack } from "expo-router";

/** Personalised plan list + one-item detail. Hidden from the tab bar. */
export default function PlanLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
