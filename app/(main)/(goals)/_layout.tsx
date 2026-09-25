import { Stack } from "expo-router";

/** SMART goals — list, create, detail. Hidden from the tab bar. */
export default function GoalsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
