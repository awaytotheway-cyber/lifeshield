import { Stack } from "expo-router";

/**
 * BRCA → CTC → SNP. Hidden from the tab bar. Back cannot skip ahead
 * because each screen uses replace() and the sequence gate.
 */
export default function ConsentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        gestureEnabled: false,
      }}
    />
  );
}
