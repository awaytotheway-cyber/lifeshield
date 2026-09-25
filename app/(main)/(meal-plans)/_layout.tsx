import { Stack } from "expo-router";

/** Meal planner. Hidden from the tab bar. */
export default function MealPlansLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
