import { Stack } from "expo-router";

/** More tab: settings hub, profile, privacy, help, shells. */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="help" />
      <Stack.Screen name="about" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="consents" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="prescriptions" />
      <Stack.Screen name="notifications-inbox" />
    </Stack>
  );
}
