import { Stack } from "expo-router";

/** Recipes library. Hidden from the tab bar. */
export default function RecipesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
