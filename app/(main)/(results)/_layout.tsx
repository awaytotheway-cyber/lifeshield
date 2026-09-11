import { Stack } from "expo-router";

/** Suggested tests (index) plus lab dashboard / detail / admin entry. Hidden from tabs. */
export default function ResultsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
